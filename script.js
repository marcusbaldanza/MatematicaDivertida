document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos DOM ---
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const endScreen = document.getElementById('end-screen');
    const playerNameInput = document.getElementById('player-name');
    const startGameButton = document.getElementById('start-game-button');
    const showRankingButton = document.getElementById('show-ranking-button');
    const showRankingEndButton = document.getElementById('show-ranking-end-button');
    const playAgainButton = document.getElementById('play-again-button');
    const scoreDisplay = document.getElementById('score');
    const timerDisplay = document.getElementById('timer');
    const questionTimerDisplay = document.getElementById('question-timer');
    const questionElement = document.getElementById('question');
    const optionButtons = document.querySelectorAll('.option-button');
    const feedbackElement = document.getElementById('feedback');
    const finalPlayerName = document.getElementById('final-player-name');
    const finalScore = document.getElementById('final-score');
    const finalGameTime = document.getElementById('final-game-time');
    const finalCorrectAnswers = document.getElementById('final-correct-answers');
    const finalWrongAnswers = document.getElementById('final-wrong-answers');
    const rankingModal = document.getElementById('ranking-modal');
    const rankingList = document.getElementById('ranking-list');
    const closeModalButton = document.querySelector('.close-button');
    const exportRankingButton = document.getElementById('export-ranking-button');
    const gameContainer = document.querySelector('.game-container'); // O container principal do jogo

    // --- Variáveis de Jogo ---
    let playerName = '';
    let score = 0;
    let timeLeft = 0; // Tempo restante do jogo
    let questionTimeLeft = 0; // Tempo restante para a pergunta atual
    let gameTimerInterval;
    let questionTimerInterval;
    let currentQuestion = {};
    let correctAnswersCount = 0;
    let wrongAnswersCount = 0;
    let difficultyLevel = 1;
    let totalGameDuration = 0;
    let currentOptionClickHandler = null; // Para armazenar a referência da função de clique dos botões

    // --- Variáveis de Controle de Cor e Dificuldade ---
    let currentColourStage = 0;
    const TOTAL_COLOR_STAGES = 17; // De 0 a 16, total de 17 estágios
    const CORRECT_ANSWERS_PER_STAGE = 3; // Mudar de cor a cada 3 respostas corretas

    // --- Constantes do Jogo ---
    const MAX_RANKING_ENTRIES = 10;
    const INITIAL_GAME_TIME = 60; // Tempo inicial do jogo em segundos
    const QUESTION_TIME_LIMIT = 10; // Tempo limite para responder cada questão em segundos

    // --- FUNÇÕES DE CONTROLE DE TELA ---
    /**
     * Exibe a tela especificada e oculta as outras.
     * @param {HTMLElement} screenToShow - O elemento DOM da tela a ser mostrada.
     */
    function showScreen(screenToShow) {
        // Oculta todas as telas removendo a classe 'active'
        // O CSS agora garante que telas sem 'active' são invisíveis e não interativas
        startScreen.classList.remove('active');
        gameScreen.classList.remove('active');
        endScreen.classList.remove('active');

        // Adiciona a classe 'active' para mostrar a tela desejada
        screenToShow.classList.add('active');

        // Remove quaisquer efeitos de transição específicos do container que não devem persistir
        gameContainer.classList.remove('starting-game', 'game-over');

        // Garante que todos os timers estejam parados ao mudar de tela
        clearAllTimers();

        // Garante que o modal de ranking esteja fechado ao mudar de tela principal
        rankingModal.classList.remove('active-modal');
    }

    // --- FUNÇÕES DE LÓGICA DO JOGO ---

    /** Limpa todos os intervalos de tempo (timers). */
    function clearAllTimers() {
        clearInterval(gameTimerInterval);
        clearInterval(questionTimerInterval);
    }

    /**
     * Gera um número aleatório dentro de um range.
     * @param {number} min - O valor mínimo (inclusive).
     * @param {number} max - O valor máximo (inclusive).
     * @returns {number} Um número inteiro aleatório.
     */
    function getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /** Gera uma nova questão de matemática com base na dificuldade atual. */
    function generateQuestion() {
        const operations = ['+', '-', '*', '/'];
        let operation = operations[getRandomNumber(0, operations.length - 1)];

        let num1, num2, answer;
        let maxNum = 10 * difficultyLevel;

        // Ajusta maxNum para controlar o crescimento da dificuldade
        if (difficultyLevel > 5) {
            maxNum = 20 + (difficultyLevel - 5) * 10;
            if (maxNum > 200) maxNum = 200;
        }

        num1 = getRandomNumber(1, maxNum);
        num2 = getRandomNumber(1, maxNum);

        // Lógica específica para cada operação para garantir resultados inteiros e números razoáveis
        switch (operation) {
            case '+':
                break;
            case '-':
                if (num1 < num2) {
                    [num1, num2] = [num2, num1]; // Troca para evitar resultados negativos
                }
                break;
            case '*':
                num1 = getRandomNumber(1, Math.min(maxNum, 15));
                num2 = getRandomNumber(1, Math.min(maxNum, 15));
                break;
            case '/':
                // Garante que a divisão resulte em um número inteiro
                let tempDivisor = getRandomNumber(2, Math.max(2, Math.floor(maxNum / 5)));
                if (tempDivisor === 0) tempDivisor = 2; // Evita divisão por zero
                let tempResult = getRandomNumber(1, Math.max(1, Math.floor(maxNum / tempDivisor)));
                num1 = tempDivisor * tempResult; // O dividendo é múltiplo exato do divisor
                num2 = tempDivisor;
                break;
        }

        // Calcula a resposta correta
        switch (operation) {
            case '+': answer = num1 + num2; break;
            case '-': answer = num1 - num2; break;
            case '*': answer = num1 * num2; break;
            case '/': answer = num1 / num2; break;
        }

        currentQuestion = {
            num1,
            num2,
            operation,
            answer: Math.round(answer) // Garante que a resposta correta seja inteira
        };

        displayQuestion();
    }

    /** Exibe a questão atual e gera as opções de resposta. */
    function displayQuestion() {
        questionElement.textContent = `${currentQuestion.num1} ${currentQuestion.operation} ${currentQuestion.num2} = ?`;

        // Remove o manipulador de eventos ANTERIOR de todos os botões para evitar múltiplos listeners
        optionButtons.forEach((button) => {
            if (currentOptionClickHandler) {
                button.removeEventListener('click', currentOptionClickHandler);
            }
        });

        const options = new Set();
        options.add(currentQuestion.answer); // Adiciona a resposta correta

        // Lógica para gerar 3 respostas falsas únicas e inteiras
        let attempts = 0;
        const MAX_ATTEMPTS = 50; // Aumentado para dar mais chances

        while (options.size < 4 && attempts < MAX_ATTEMPTS) {
            let fakeAnswer;
            const strategy = getRandomNumber(0, 3); // 0: Pequena variação, 1: Grande variação, 2: Operação "vizinha", 3: Potência de 10

            switch (strategy) {
                case 0: // Pequena variação
                    fakeAnswer = currentQuestion.answer + getRandomNumber(-Math.max(1, Math.floor(Math.abs(currentQuestion.answer) * 0.1)), Math.max(1, Math.floor(Math.abs(currentQuestion.answer) * 0.1)));
                    break;
                case 1: // Variação maior
                    fakeAnswer = currentQuestion.answer + getRandomNumber(-Math.max(5, Math.floor(Math.abs(currentQuestion.answer) * 0.2)), Math.max(5, Math.floor(Math.abs(currentQuestion.answer) * 0.2)));
                    break;
                case 2: // Operação "vizinha"
                    let altOp = currentQuestion.operation;
                    const possibleOps = ['+', '-', '*', '/'].filter(op => op !== currentQuestion.operation);
                    if (possibleOps.length > 0) {
                        altOp = possibleOps[getRandomNumber(0, possibleOps.length - 1)];
                    }
                    // Simplesmente tenta com os números originais, pode resultar em não-inteiro que será arredondado
                    try {
                         if (altOp === '+') fakeAnswer = currentQuestion.num1 + currentQuestion.num2;
                         else if (altOp === '-') fakeAnswer = currentQuestion.num1 - currentQuestion.num2;
                         else if (altOp === '*') fakeAnswer = currentQuestion.num1 * currentQuestion.num2;
                         else if (altOp === '/') {
                             if (currentQuestion.num2 !== 0 && currentQuestion.num1 % currentQuestion.num2 === 0) {
                                 fakeAnswer = currentQuestion.num1 / currentQuestion.num2;
                             } else {
                                 fakeAnswer = getRandomNumber(1, 10); // Valor aleatório se não for divisão exata
                             }
                         }
                    } catch (e) {
                        fakeAnswer = getRandomNumber(currentQuestion.answer - 10, currentQuestion.answer + 10);
                    }
                    break;
                case 3: // Multiplicação/divisão por potências de 10
                    if (Math.random() < 0.5) {
                        fakeAnswer = currentQuestion.answer * (Math.random() < 0.5 ? 10 : 100);
                    } else {
                        let divisorPow = (Math.random() < 0.5 ? 10 : 100);
                        if (currentQuestion.answer % divisorPow === 0) {
                            fakeAnswer = currentQuestion.answer / divisorPow;
                        } else {
                            fakeAnswer = Math.floor(currentQuestion.answer / divisorPow); // Apenas a parte inteira
                        }
                    }
                    if (currentQuestion.answer === 0) fakeAnswer = getRandomNumber(1, 10) * (Math.random() < 0.5 ? 1 : -1);
                    break;
            }

            // Garante que todas as respostas falsas sejam inteiras e evita duplicatas ou valores extremos
            fakeAnswer = Math.round(fakeAnswer);
            if (fakeAnswer !== currentQuestion.answer && Math.abs(fakeAnswer) < 5000 && (fakeAnswer >= 0 || currentQuestion.operation === '-')) {
                options.add(fakeAnswer);
            }
            attempts++;
        }

        // Preenchimento agressivo se ainda faltarem opções únicas
        while (options.size < 4) {
            let emergencyFake = Math.round(currentQuestion.answer + getRandomNumber(-20, 20));
            if (emergencyFake === currentQuestion.answer) emergencyFake += (Math.random() < 0.5 ? 1 : -1);
            options.add(emergencyFake);
        }

        const shuffledOptions = Array.from(options).sort(() => Math.random() - 0.5);

        // Define e atribui a NOVA função de manipulador de eventos para esta rodada
        currentOptionClickHandler = (event) => {
            checkAnswer(parseFloat(event.target.textContent));
        };

        optionButtons.forEach((button, index) => {
            button.textContent = shuffledOptions[index];
            button.addEventListener('click', currentOptionClickHandler);
        });

        resetQuestionTimer();
    }

    /** Inicia o cronômetro para a questão atual. */
    function startQuestionTimer() {
        questionTimeLeft = QUESTION_TIME_LIMIT;
        questionTimerDisplay.textContent = questionTimeLeft.toFixed(1);

        clearInterval(questionTimerInterval); // Limpa qualquer timer anterior
        questionTimerInterval = setInterval(() => {
            questionTimeLeft -= 0.1;
            if (questionTimeLeft <= 0) {
                questionTimeLeft = 0;
                clearInterval(questionTimerInterval);
                handleWrongAnswer(); // Se o tempo acabar, conta como resposta errada
                setTimeout(generateQuestion, 500); // Gera próxima questão
            }
            questionTimerDisplay.textContent = questionTimeLeft.toFixed(1);
        }, 100); // Atualiza a cada 100ms (0.1s)
    }

    /** Reseta e inicia o cronômetro da questão. */
    function resetQuestionTimer() {
        clearInterval(questionTimerInterval);
        startQuestionTimer();
    }

    /**
     * Verifica se a resposta selecionada está correta.
     * @param {number} selectedAnswer - A resposta escolhida pelo jogador.
     */
    function checkAnswer(selectedAnswer) {
        clearInterval(questionTimerInterval); // Para o cronômetro da questão

        if (selectedAnswer === currentQuestion.answer) {
            handleCorrectAnswer();
        } else {
            handleWrongAnswer();
        }
        setTimeout(generateQuestion, 500); // Gera a próxima questão após um pequeno atraso para o feedback
    }

    /** Lida com as ações para uma resposta correta. */
    function handleCorrectAnswer() {
        const maxPoints = 5;
        const timeRatio = Math.max(0, questionTimeLeft / QUESTION_TIME_LIMIT);
        let pointsEarned = maxPoints * timeRatio;

        score += pointsEarned;
        score = parseFloat(score.toFixed(2)); // Arredonda o score total

        timeLeft += 3; // Adiciona tempo ao timer do jogo
        correctAnswersCount++;

        // --- Lógica de Mudança de Cor do Game Container ---
        if (currentColourStage < TOTAL_COLOR_STAGES -1) { // -1 para não passar do último estágio antes do rainbow
            if (correctAnswersCount % CORRECT_ANSWERS_PER_STAGE === 0) {
                currentColourStage++;
                gameContainer.style.backgroundColor = `var(--color-stage-${currentColourStage})`;

                // Ajusta a cor do texto para legibilidade conforme o fundo fica escuro
                if (currentColourStage >= 7) { // A partir do amarelo simples, o fundo fica mais escuro
                    gameContainer.classList.remove('dark-text-mode');
                    gameContainer.classList.add('light-text-mode');
                } else {
                    gameContainer.classList.remove('light-text-mode');
                    gameContainer.classList.add('dark-text-mode');
                }
            }
        } else {
            // Se atingiu o último estágio de cor ou passou, ativa o modo arco-íris
            gameContainer.classList.add('rainbow-mode');
            gameContainer.classList.add('light-text-mode'); // Garante texto claro no modo rainbow
        }
        // --- Fim da Lógica de Mudança de Cor ---

        feedbackElement.textContent = `Certo! +${pointsEarned.toFixed(2)} pontos!`;
        feedbackElement.classList.add('correct');
        feedbackElement.classList.remove('wrong');
        updateDisplay();
        setTimeout(() => feedbackElement.classList.remove('correct'), 500);

        // Aumenta a dificuldade a cada 5 respostas corretas
        if (correctAnswersCount % 5 === 0) {
            difficultyLevel++;
        }
    }

    /** Lida com as ações para uma resposta errada. */
    function handleWrongAnswer() {
        score = Math.max(0, score - 5); // Perde 5 pontos, mínimo 0
        timeLeft = Math.max(0, timeLeft - 10); // Perde 10 segundos, mínimo 0
        wrongAnswersCount++;
        feedbackElement.textContent = `Errado!`;
        feedbackElement.classList.add('wrong');
        feedbackElement.classList.remove('correct');
        updateDisplay();
        setTimeout(() => feedbackElement.classList.remove('wrong'), 500);

        // Diminui a dificuldade se tiver muitos erros seguidos
        if (wrongAnswersCount % 3 === 0 && difficultyLevel > 1) {
            difficultyLevel = Math.max(1, difficultyLevel - 1);
        }
    }

    /** Atualiza os displays de score e tempo na interface. */
    function updateDisplay() {
        scoreDisplay.textContent = score.toFixed(2);
        timerDisplay.textContent = timeLeft.toFixed(2);
    }

    /** Inicia o cronômetro geral do jogo. */
    function startGameTimer() {
        totalGameDuration = 0; // Reseta a duração total do jogo
        timeLeft = INITIAL_GAME_TIME; // Define o tempo inicial
        updateDisplay();

        clearInterval(gameTimerInterval); // Limpa qualquer timer anterior do jogo
        gameTimerInterval = setInterval(() => {
            timeLeft -= 0.01; // Decrementa a cada 10ms
            totalGameDuration += 0.01;

            if (timeLeft <= 0) {
                timeLeft = 0;
                clearInterval(gameTimerInterval);
                clearInterval(questionTimerInterval); // Garante que o timer da questão também pare
                endGame(); // Termina o jogo
            }
            timerDisplay.textContent = timeLeft.toFixed(2);
        }, 10); // Atualiza a cada 10ms
    }

    /** Inicia uma nova partida do jogo. */
    function startGame() {
        playerName = playerNameInput.value.trim();
        if (!playerName) {
            alert('Por favor, digite seu nome para iniciar o jogo!');
            playerNameInput.focus(); // Coloca o foco no campo de nome
            return;
        }

        // Resetar todas as variáveis do jogo para uma nova partida
        score = 0;
        correctAnswersCount = 0;
        wrongAnswersCount = 0;
        difficultyLevel = 1;

        // Limpa feedback visual
        feedbackElement.classList.remove('correct', 'wrong');
        feedbackElement.textContent = '';

        // --- Reset da cor e tema do gameContainer para o início do jogo ---
        currentColourStage = 0; // Reseta o estágio de cor para o primeiro
        gameContainer.style.backgroundColor = `var(--color-stage-0)`; // Garante que o game-container seja branco
        gameContainer.classList.remove('rainbow-mode', 'light-text-mode'); // Remove o modo arco-íris e texto claro
        gameContainer.classList.add('dark-text-mode'); // Garante que o texto seja escuro para o fundo branco
        // --- Fim do Reset de cor ---

        showScreen(gameScreen); // Transiciona para a tela do jogo

        // Adiciona e remove classe para um efeito de transição visual do container
        gameContainer.classList.add('starting-game');
        setTimeout(() => {
            gameContainer.classList.remove('starting-game');
        }, 500);

        startGameTimer(); // Inicia o timer geral do jogo
        generateQuestion(); // Gera a primeira questão
        updateDisplay(); // Atualiza os displays iniciais de score e tempo
    }

    /** Finaliza a partida atual do jogo e exibe a tela de resultados. */
    function endGame() {
        clearAllTimers(); // Para todos os timers

        showScreen(endScreen); // Transiciona para a tela de fim de jogo

        // Adiciona e remove classe para um efeito de transição visual do container
        gameContainer.classList.add('game-over');
        setTimeout(() => {
            gameContainer.classList.remove('game-over');
        }, 500);

        // Exibe os resultados finais
        finalPlayerName.textContent = playerName;
        finalScore.textContent = score.toFixed(2);
        finalGameTime.textContent = `${totalGameDuration.toFixed(2)}s`;
        finalCorrectAnswers.textContent = correctAnswersCount;
        finalWrongAnswers.textContent = wrongAnswersCount;

        saveRanking(); // Salva o resultado no ranking

        // Garante que o modo rainbow pare ao exibir tela final e reseta cor
        gameContainer.classList.remove('rainbow-mode');
        gameContainer.style.backgroundColor = `var(--color-stage-0)`; // Volta para branco
        gameContainer.classList.remove('light-text-mode');
        gameContainer.classList.add('dark-text-mode');
    }

    // --- FUNÇÕES DE RANKING ---

    /** Salva o resultado da partida atual no ranking local. */
    function saveRanking() {
        let ranking = JSON.parse(localStorage.getItem('mathChallengerRanking')) || [];
        const now = new Date();
        const dateTimeString = now.toLocaleString('pt-BR', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        ranking.push({
            name: playerName,
            score: parseFloat(score.toFixed(2)), // Salva score com 2 casas decimais
            time: parseFloat(totalGameDuration.toFixed(2)), // Salva tempo com 2 casas decimais
            correct: correctAnswersCount,
            wrong: wrongAnswersCount,
            date: dateTimeString
        });

        // Ordena o ranking por pontuação (maior primeiro) e depois por tempo (menor primeiro)
        ranking.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.time - b.time;
        });

        // Limita o ranking ao número máximo de entradas
        ranking = ranking.slice(0, MAX_RANKING_ENTRIES);
        localStorage.setItem('mathChallengerRanking', JSON.stringify(ranking));
    }

    /** Exibe o ranking no modal. */
    function displayRanking() {
        rankingList.innerHTML = ''; // Limpa a lista existente
        let ranking = JSON.parse(localStorage.getItem('mathChallengerRanking')) || [];

        if (ranking.length === 0) {
            rankingList.innerHTML = '<p>Nenhuma partida registrada ainda.</p>';
            return;
        }

        ranking.forEach((entry, index) => {
            const div = document.createElement('div');
            div.innerHTML = `
                <strong>${index + 1}. ${entry.name}</strong> - Pontos: ${entry.score} | Tempo: ${entry.time}s | Certas: ${entry.correct} | Erradas: ${entry.wrong} (${entry.date})
            `;
            rankingList.appendChild(div);
        });
    }

    /** Exporta o ranking como uma imagem PNG usando html2canvas. */
    async function exportRankingAsImage() {
        // Cria um div temporário para renderizar o ranking para a imagem
        const rankingToExport = document.createElement('div');
        rankingToExport.className = 'ranking-export-image'; // Estilos específicos para a imagem
        rankingToExport.innerHTML = `
            <h2>Ranking Math Challenger</h2>
            <div id="ranking-list-export"></div>
            <div class="timestamp">Gerado em: ${new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'medium' })}</div>
        `;
        document.body.appendChild(rankingToExport); // Adiciona ao DOM temporariamente

        const exportList = rankingToExport.querySelector('#ranking-list-export');
        let ranking = JSON.parse(localStorage.getItem('mathChallengerRanking')) || [];

        if (ranking.length === 0) {
            exportList.innerHTML = '<p>Nenhuma partida registrada.</p>';
        } else {
            ranking.forEach((entry, index) => {
                const div = document.createElement('div');
                div.innerHTML = `
                    <strong>${index + 1}. ${entry.name}</strong> - Pontos: ${entry.score} | Tempo: ${entry.time}s | Certas: ${entry.correct} | Erradas: ${entry.wrong}
                `;
                exportList.appendChild(div);
            });
        }

        try {
            // Renderiza o elemento temporário para um canvas
            const canvas = await html2canvas(rankingToExport, {
                scale: 2, // Aumenta a escala para melhor qualidade
                logging: false, // Desabilita logs
                useCORS: true,
                backgroundColor: null // Mantém o fundo transparente ou deixa o CSS lidar
            });

            // Converte o canvas para uma URL de dados (PNG)
            const image = canvas.toDataURL('image/png');
            // Cria um link temporário para download
            const link = document.createElement('a');
            link.href = image;
            link.download = `ranking_math_challenger_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click(); // Simula um clique para iniciar o download
            document.body.removeChild(link); // Remove o link temporário
        } catch (error) {
            console.error('Erro ao exportar ranking como imagem:', error);
            alert('Não foi possível exportar o ranking. Verifique o console para mais detalhes.');
        } finally {
            document.body.removeChild(rankingToExport); // Remove o elemento temporário do DOM
        }
    }

    // --- EVENT LISTENERS ---
    startGameButton.addEventListener('click', startGame);

    playAgainButton.addEventListener('click', () => {
        playerNameInput.value = ''; // Limpa o campo de nome
        showScreen(startScreen); // Volta para a tela de início
    });

    showRankingButton.addEventListener('click', () => {
        displayRanking();
        rankingModal.classList.add('active-modal'); // Adiciona classe para exibir
    });

    showRankingEndButton.addEventListener('click', () => {
        displayRanking();
        rankingModal.classList.add('active-modal'); // Adiciona classe para exibir
    });

    closeModalButton.addEventListener('click', () => {
        rankingModal.classList.remove('active-modal'); // Remove classe para ocultar
    });

    // Fecha o modal se clicar fora dele
    window.addEventListener('click', (event) => {
        if (event.target === rankingModal) {
            rankingModal.classList.remove('active-modal');
        }
    });

    exportRankingButton.addEventListener('click', exportRankingAsImage);

    // --- INICIALIZAÇÃO ---
    showScreen(startScreen); // Garante que a tela de início seja a primeira a ser exibida ao carregar
});