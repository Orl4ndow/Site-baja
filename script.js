document.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    try {
        // --- INÍCIO: Configuração do Firebase ---
        const firebaseConfig = {
            apiKey: "AIzaSyDSt6t_gQCW94cXoQKarPcbqOJkXppWzZc",
            authDomain: "baja-eletronica.firebaseapp.com",
            projectId: "baja-eletronica",
            storageBucket: "baja-eletronica.appspot.com",
            messagingSenderId: "770422250340",
            appId: "1:770422250340:web:40dd3f5d8166854f8bf871"
        };

        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const projectDocRef = db.collection("projects").doc("mainProject");
        // --- FIM: Configuração do Firebase ---

        // --- Armazenamento de Dados ---
        const defaultData = {
            scope: "Este é o espaço para o termo de abertura e escopo do seu projeto Baja SAE. Descreva a justificativa, objetivos, entregáveis, critérios de aceitação, premissas e restrições.",
            eap: "1.0 Gestão do Projeto\n  1.1 Iniciação\n  1.2 Planejamento\n  1.3 Execução\n2.0 Projeto do Veículo\n  2.1 Estrutura\n    2.1.1 Chassi\n    2.1.2 Carenagem\n  2.2 Powertrain\n    2.2.1 Motor\n    2.2.2 Transmissão\n  2.3 Eletrônica",
            cronograma: [{id: 1, taskId: "2.1.1", responsavel: "Equipe de Estrutura", inicio: "2025-08-01", fim: "2025-09-15"}],
            riscos: [{id: 1, descricao: "Atraso na entrega de peças", probabilidade: "Média", impacto: "Alto", mitigacao: "Manter contato semanal com fornecedores."}],
            reunioes: [{id: 1, data: "2025-07-20", participantes: "Toda a equipe", pauta: "Reunião de Kick-off do projeto."}],
            links: [{id: 1, url: "http://www.saebrasil.org.br", descricao: "Site Oficial SAE Brasil"}],
            avisos: [{id: 1, texto: "Bem-vindos ao novo painel de gestão!", createdAt: new Date().toISOString()}],
            // NOVO: Dados iniciais para o Kanban (incluindo datas)
            kanban: [
                { id: Date.now(), title: "Definir Layout do Dashboard", status: "done", createdAt: new Date().toISOString(), lastMovedAt: new Date().toISOString() },
                { id: Date.now() + 1, title: "Integrar Firebase Firestore", status: "doing", createdAt: new Date().toISOString(), lastMovedAt: new Date().toISOString() },
                { id: Date.now() + 2, title: "Criar novo card Kanban", status: "todo", createdAt: new Date().toISOString(), lastMovedAt: new Date().toISOString() }
            ]
        };

        let dataStore = {};
        
        // NOVO: Função para formatar data e hora
        function formatKanbanDate(isoString) {
            if (!isoString) return 'N/A';
            const date = new Date(isoString);
            const options = {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            };
            return date.toLocaleDateString('pt-BR', options);
        }

        async function loadData() {
            const doc = await projectDocRef.get();
            if (doc.exists) {
                const firestoreData = doc.data();
                Object.keys(defaultData).forEach(key => {
                   dataStore[key] = firestoreData[key] !== undefined ? firestoreData[key] : defaultData[key];
                });
                // Tratamento para converter EAP antiga (array) para string
                if (Array.isArray(dataStore.eap)) {
                    console.log("Convertendo estrutura antiga da EAP...");
                    dataStore.eap = dataStore.eap.map(item => `${item.codigo} ${item.descricao}`).join('\n');
                }
            } else {
                console.log("Nenhum projeto encontrado. Criando novo com dados padrão.");
                dataStore = JSON.parse(JSON.stringify(defaultData));
                await saveData();
            }
        }

        async function saveData() {
            try {
                // Remove propriedades que são arrays ou objetos para serializar, se necessário.
                // Mas neste caso, o Firebase 8.10 lida bem com arrays e objetos aninhados simples.
                await projectDocRef.set(dataStore);
                console.log("Dados salvos no Firestore.");
            } catch (error) {
                console.error("Erro ao guardar dados no Firestore: ", error);
                alert("Ocorreu um erro ao guardar os dados. Verifique a consola para mais detalhes.");
            }
        }
        
        function renderAll() {
            renderDashboard();
            renderKanban(); 
            renderEscopoView();
            renderEAPView();
            renderCronogramaView();
            renderRiscosView();
            renderReunioesView();
            renderLinksView();
            renderAvisosView();
            renderEscopoEdit();
            renderEAPEdit();
            renderCronogramaEdit();
            renderRiscosEdit();
            renderReunioesEdit();
            renderLinksEdit();
            renderAvisosEdit();
        }

        // --- FUNÇÕES KANBAN ---
        
        // 1. Renderiza o quadro Kanban a partir do dataStore
        function renderKanban() {
            const columns = ['todo', 'doing', 'done']; 
            
            columns.forEach(status => {
                const listElement = document.getElementById(`card-list-${status}`);
                if (!listElement) return; 
                
                // Filtra os cards para a coluna atual
                const cards = dataStore.kanban.filter(card => card.status === status)
                                             .sort((a, b) => a.id - b.id); 

                listElement.innerHTML = cards.map(card => `
                    <div class="kanban-card flex flex-col justify-between items-start" 
                         draggable="true" 
                         id="card-${card.id}" 
                         ondragstart="kanbanDrag(event)">
                        
                        <!-- Linha 1: Título e Botão de Exclusão -->
                        <div class="flex justify-between w-full mb-2">
                            <span class="card-text font-medium">${card.title}</span>
                            <span class="delete-card-btn" 
                                  onclick="event.stopPropagation(); kanbanDeleteCard(${card.id})">
                                &times;
                            </span>
                        </div>

                        <!-- Linha 2: Datas de Criação e Movimentação (NOVO) -->
                        <div class="text-xs text-gray-500 w-full space-y-0.5">
                            <p title="Data de Criação"><i data-lucide="plus-circle" class="w-3 h-3 inline mr-1"></i> Criado: ${formatKanbanDate(card.createdAt)}</p>
                            <p title="Última Movimentação"><i data-lucide="move" class="w-3 h-3 inline mr-1"></i> Movido: ${formatKanbanDate(card.lastMovedAt)}</p>
                        </div>
                    </div>
                `).join('');
            });
            
            // Re-cria os ícones Lucide para os novos elementos injetados
            lucide.createIcons(); 
        }

        // 2. Lógica de Drag and Drop (Salva no Firestore no Drop)

        let draggedCardId = null;

        window.kanbanAllowDrop = function(event) {
            event.preventDefault();
        }

        window.kanbanDrag = function(event) {
            // Pega o ID numérico
            draggedCardId = event.target.id.split('-')[1]; 
            event.dataTransfer.setData("text/plain", event.target.id);
            event.target.style.opacity = '0.5'; // Feedback visual
        }

        window.kanbanDrop = async function(event) {
            event.preventDefault();
            
            const cardIdString = event.dataTransfer.getData("text/plain");
            const cardElement = document.getElementById(cardIdString);
            
            if (cardElement) {
                cardElement.style.opacity = '1'; // Restaura opacidade

                // Encontra a lista de cards (card-list) dentro da coluna
                let targetElement = event.target;
                let targetList = null;

                // Percorre os pais até encontrar a lista de cards ou a coluna
                while (targetElement) {
                    if (targetElement.classList && targetElement.classList.contains('card-list')) {
                        targetList = targetElement; // Encontrou a lista
                        break;
                    }
                    if (targetElement.classList && targetElement.classList.contains('kanban-column-style')) {
                        // Encontrou a coluna, mas o drop foi na área vazia/título
                        targetList = targetElement.querySelector('.card-list');
                        break;
                    }
                    targetElement = targetElement.parentElement;
                }
                
                if (!targetList) return; // Se não encontrou o alvo válido, sai.

                // Pega o status da coluna de destino
                const newStatus = targetList.parentElement.id.replace('column-', '');
                const cardId = parseInt(draggedCardId);
                
                // Move o card (DOM)
                targetList.appendChild(cardElement);

                // 1. Atualiza o dataStore
                const cardIndex = dataStore.kanban.findIndex(card => card.id === cardId);
                if (cardIndex !== -1 && dataStore.kanban[cardIndex].status !== newStatus) {
                    
                    dataStore.kanban[cardIndex].status = newStatus;
                    
                    // NOVO: Atualiza a data da última movimentação
                    dataStore.kanban[cardIndex].lastMovedAt = new Date().toISOString(); 

                    // 2. Salva no Firestore
                    await saveData(); 

                    // 3. Atualiza o DOM (Chamando renderKanban para garantir a ordem correta)
                    renderKanban(); 
                }
            }
        }

        // 3. Adiciona um novo card
        window.kanbanRequestCardName = function(columnId) {
            // Usando prompt() para input rápido
            const taskName = prompt("Digite o nome da nova tarefa:");

            if (taskName && taskName.trim() !== "") {
                kanbanAddCard(columnId, taskName.trim());
            } else if (taskName !== null) {
                alert("O nome da tarefa não pode ser vazio.");
            }
        }

        window.kanbanAddCard = async function(status, title) {
            const now = new Date().toISOString(); // Captura a data/hora atual no formato ISO
            const newCard = {
                id: Date.now(),
                title: title,
                status: status,
                createdAt: now,       // NOVO: Data de criação
                lastMovedAt: now      // NOVO: Data da primeira movimentação (que é a criação)
            };
            
            dataStore.kanban.push(newCard);
            await saveData();
            renderKanban();
        }

        // 4. Exclui um card
        window.kanbanDeleteCard = async function(id) {
            if (confirm('Tem a certeza que quer apagar este card?')) {
                dataStore.kanban = dataStore.kanban.filter(card => card.id !== id);
                await saveData();
                renderKanban();
            }
        }


        // --- Resto das Funções do Dashboard (Inalteradas, mas mantidas para o contexto) ---

        // --- Navegação ---
        const navLinks = document.querySelectorAll('.nav-link');
        const pages = document.querySelectorAll('.page');
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mainNav = document.getElementById('main-nav');
        const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
        const mobilePageTitle = document.getElementById('mobile-page-title');

        function navigateTo(hash) {
            const targetHash = hash || '#dashboard';
            const activeLink = document.querySelector(`.nav-link[href="${targetHash}"]`);
            
            navLinks.forEach(link => link.classList.remove('active'));
            if(activeLink) {
                activeLink.classList.add('active');
                mobilePageTitle.textContent = activeLink.textContent.trim();
            }

            pages.forEach(page => page.classList.toggle('active', '#' + page.id === targetHash));
            
            // Fecha o menu mobile ao navegar
            mainNav.classList.remove('open');
            mobileNavOverlay.classList.remove('open');
        }

        // **CÓDIGO CORRIGIDO**
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = e.currentTarget.getAttribute('href');

                // Se o link NÃO começa com '#', é um link externo.
                // Deixa o navegador fazer a ação padrão (abrir o link) e para a execução.
                if (href && !href.startsWith('#')) {
                    return; 
                }
                
                // Se o código chegou aqui, é um link interno (começa com '#').
                // Então, previne a ação padrão e usa a navegação do dashboard.
                e.preventDefault();

                if (e.currentTarget.id === 'config-link') {
                    const password = prompt("Insira a senha:");
                    if (password === "123456789") { // Sua senha
                        window.location.hash = href;
                    } else {
                        alert("Senha incorreta!");
                    }
                } else {
                    window.location.hash = href;
                }
            });
        });
        
        mobileMenuButton.addEventListener('click', () => {
            mainNav.classList.add('open');
            mobileNavOverlay.classList.add('open');
        });
        mobileNavOverlay.addEventListener('click', () => {
            mainNav.classList.remove('open');
            mobileNavOverlay.classList.remove('open');
        });

        window.addEventListener('hashchange', () => navigateTo(window.location.hash));
        
        window.deleteItem = async (sectionName, id) => {
            if (confirm('Tem a certeza que quer apagar este item?')) {
                dataStore[sectionName] = dataStore[sectionName].filter(item => item.id !== id);
                await saveData();
                renderAll();
            }
        };

        // Escopo
        function renderEscopoView() { document.getElementById('escopo-view').textContent = dataStore.scope || ''; }
        function renderEscopoEdit() { document.getElementById('escopo-text-edit').value = dataStore.scope || ''; }
        document.getElementById('salvar-escopo-edit').addEventListener('click', async () => {
            dataStore.scope = document.getElementById('escopo-text-edit').value;
            await saveData();
            alert("Escopo guardado com sucesso!");
            renderEscopoView();
        });

        // EAP (Nova versão com textarea)
        function renderEAPView() { document.getElementById('eap-view').textContent = dataStore.eap || ''; }
        function renderEAPEdit() { document.getElementById('eap-text-edit').value = dataStore.eap || ''; }
        document.getElementById('salvar-eap-edit').addEventListener('click', async () => {
            dataStore.eap = document.getElementById('eap-text-edit').value;
            await saveData();
            alert("EAP guardada com sucesso!");
            renderEAPView();
        });

        // Cronograma
        function renderCronogramaView() {
             const tasks = dataStore.cronograma || [];
            if (!tasks || tasks.length === 0) { document.getElementById('cronograma-table-view').innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">Nenhuma tarefa.</td></tr>`; return; }
            tasks.sort((a,b) => new Date(a.inicio) - new Date(b.inicio));
            document.getElementById('cronograma-table-view').innerHTML = tasks.map(task => `<tr class="hover:bg-gray-50"><td class="px-6 py-4">${task.taskId}</td><td class="px-6 py-4">${task.responsavel}</td><td class="px-6 py-4">${new Date(task.inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td class="px-6 py-4">${new Date(task.fim + 'T00:00:00').toLocaleDateString('pt-BR')}</td></tr>`).join('');
        }
        function renderCronogramaEdit() {
            const tasks = dataStore.cronograma || [];
            if (!tasks || tasks.length === 0) { document.getElementById('cronograma-table-edit').innerHTML = `<tr><td colspan="5" class="text-center py-4 text-gray-500">Nenhuma tarefa.</td></tr>`; return; }
            tasks.sort((a,b) => new Date(a.inicio) - new Date(b.inicio));
            document.getElementById('cronograma-table-edit').innerHTML = tasks.map(task => `<tr><td class="px-6 py-4">${task.taskId}</td><td class="px-6 py-4">${task.responsavel}</td><td class="px-6 py-4">${new Date(task.inicio + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td class="px-6 py-4">${new Date(task.fim + 'T00:00:00').toLocaleDateString('pt-BR')}</td><td class="px-6 py-4"><button onclick="deleteItem('cronograma', ${task.id})" class="text-red-500">Apagar</button></td></tr>`).join('');
        }
        document.getElementById('cronograma-form').addEventListener('submit', async e => {
            e.preventDefault();
            dataStore.cronograma.push({id: Date.now(), taskId: document.getElementById('cronograma-id').value, responsavel: document.getElementById('cronograma-responsavel').value, inicio: document.getElementById('cronograma-inicio').value, fim: document.getElementById('cronograma-fim').value});
            await saveData(); renderCronogramaEdit(); e.target.reset(); renderDashboard();
        });
        
        // Riscos
        function renderRiscosView() { document.getElementById('riscos-table-view').innerHTML = (dataStore.riscos || []).map(i=>`<tr><td class="px-6 py-4">${i.descricao}</td><td class="px-6 py-4">${i.probabilidade}</td><td class="px-6 py-4">${i.impacto}</td><td class="px-6 py-4">${i.mitigacao}</td></tr>`).join(''); }
        function renderRiscosEdit() { document.getElementById('riscos-table-edit').innerHTML = (dataStore.riscos || []).map(i=>`<tr><td class="px-6 py-4">${i.descricao}</td><td class="px-6 py-4">${i.probabilidade}</td><td class="px-6 py-4">${i.impacto}</td><td class="px-6 py-4">${i.mitigacao}</td><td class="px-6 py-4"><button onclick="deleteItem('riscos', ${i.id})" class="text-red-500">Apagar</button></td></tr>`).join(''); }
        document.getElementById('risco-form').addEventListener('submit', async e => {
            e.preventDefault();
            dataStore.riscos.push({id: Date.now(), descricao: document.getElementById('risco-descricao').value, probabilidade: document.getElementById('risco-probabilidade').value, impacto: document.getElementById('risco-impacto').value, mitigacao: document.getElementById('risco-mitigacao').value});
            await saveData(); renderRiscosEdit(); e.target.reset(); renderDashboard();
        });

        // Reuniões
        function renderReunioesView() { document.getElementById('reunioes-list-view').innerHTML = [...(dataStore.reunioes || [])].sort((a,b)=>new Date(b.data)-new Date(a.data)).map(i=>`<div class="bg-gray-50 p-4 rounded-lg"><h4 class="font-bold">${new Date(i.data+'T00:00:00').toLocaleDateString('pt-BR')}</h4><p class="text-sm"><strong>Participantes:</strong> ${i.participantes}</p><p class="text-sm mt-2 whitespace-pre-wrap">${i.pauta}</p></div>`).join(''); }
        function renderReunioesEdit() { document.getElementById('reunioes-list-edit').innerHTML = [...(dataStore.reunioes || [])].sort((a,b)=>new Date(b.data)-new Date(a.data)).map(i=>`<div class="bg-gray-50 p-4 rounded-lg relative"><button onclick="deleteItem('reunioes', ${i.id})" class="absolute top-2 right-2 text-red-500 text-xs">Apagar</button><h4 class="font-bold">${new Date(i.data+'T00:00:00').toLocaleDateString('pt-BR')}</h4><p class="text-sm"><strong>Participantes:</strong> ${i.participantes}</p><p class="text-sm mt-2 whitespace-pre-wrap">${i.pauta}</p></div>`).join(''); }
        document.getElementById('reuniao-form').addEventListener('submit', async e => {
            e.preventDefault();
            dataStore.reunioes.push({id: Date.now(), data: document.getElementById('reuniao-data').value, participantes: document.getElementById('reuniao-participantes').value, pauta: document.getElementById('reuniao-pauta').value});
            await saveData(); renderReunioesEdit(); e.target.reset(); renderDashboard();
        });

        // Links
        function renderLinksView() { document.getElementById('links-list-view').innerHTML = (dataStore.links || []).map(i=>`<div class="bg-gray-50 p-3 rounded"><a href="${i.url}" target="_blank" class="text-indigo-600 hover:underline">${i.descricao}</a></div>`).join(''); }
        function renderLinksEdit() { document.getElementById('links-list-edit').innerHTML = (dataStore.links || []).map(i=>`<div class="flex justify-between items-center bg-gray-50 p-2 rounded"><a href="${i.url}" target="_blank" class="text-indigo-600 hover:underline">${i.descricao}</a><button onclick="deleteItem('links', ${i.id})" class="text-red-500 text-xl px-2">&times;</button></div>`).join(''); }
        document.getElementById('link-form').addEventListener('submit', async e => {
            e.preventDefault();
            dataStore.links.push({id: Date.now(), url: document.getElementById('link-url').value, descricao: document.getElementById('link-descricao').value});
            await saveData(); renderLinksEdit(); e.target.reset();
        });
        
        // Avisos
        function renderAvisosView() {
            const sortedAvisos = [...(dataStore.avisos || [])].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            const avisosHTML = sortedAvisos.map(i => `<div class="border-b pb-2 mb-2"><p>${i.texto}</p><span class="text-xs text-gray-400">${new Date(i.createdAt).toLocaleString('pt-BR')}</span></div>`).join('');
            document.getElementById('avisos-dashboard-content').innerHTML = avisosHTML || '<p class="text-gray-400">Nenhum aviso publicado.</p>';
            document.getElementById('avisos-list-view').innerHTML = avisosHTML || '<p class="text-gray-400">Nenhum aviso publicado.</p>';
        }
         function renderAvisosEdit() {
            const sortedAvisos = [...(dataStore.avisos || [])].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            document.getElementById('avisos-list-edit').innerHTML = sortedAvisos.map(i => `<div class="border-b pb-2 mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center"><p class="mb-1 sm:mb-0">${i.texto}</p><div><span class="text-xs text-gray-400">${new Date(i.createdAt).toLocaleString('pt-BR')}</span> <button onclick="deleteItem('avisos', ${i.id})" class="text-red-500 text-xs ml-2 font-semibold">Apagar</button></div></div>`).join('');
        }
        document.getElementById('aviso-form-edit').addEventListener('submit', async (e) => {
            e.preventDefault();
            dataStore.avisos.push({ id: Date.now(), texto: document.getElementById('aviso-texto-edit').value, createdAt: new Date().toISOString() });
            await saveData(); renderAvisosEdit(); e.target.reset(); renderAvisosView();
        });

        // Dashboard
        function renderDashboard() {
            document.getElementById('dashboard-prazos').innerHTML = (dataStore.cronograma || []).filter(t=>t.fim && new Date(t.fim) >= new Date()).sort((a,b)=>new Date(a.fim) - new Date(b.fim)).slice(0,3).map(t=>`<p>${t.taskId}: <span class="font-semibold">${new Date(t.fim+'T00:00:00').toLocaleDateString('pt-BR')}</span></p>`).join('') || '<p class="text-gray-400">Nenhum prazo futuro.</p>';
            document.getElementById('dashboard-riscos').innerHTML = (dataStore.riscos || []).filter(r=>r.probabilidade === 'Alta' && r.impacto === 'Alto').slice(0,3).map(r=>`<p>${r.descricao}</p>`).join('') || '<p class="text-gray-400">Nenhum risco crítico.</p>';
            if(dataStore.reunioes && dataStore.reunioes.length > 0) document.getElementById('dashboard-reuniao').innerHTML = `<p>Data: <span class="font-semibold">${new Date([...dataStore.reunioes].sort((a,b)=>new Date(b.data)-new Date(a.data))[0].data+'T00:00:00').toLocaleDateString('pt-BR')}</span></p><p class="truncate">${[...dataStore.reunioes].sort((a,b)=>new Date(b.data)-new Date(a.data))[0].pauta}</p>`;
            else document.getElementById('dashboard-reuniao').innerHTML = '<p class="text-gray-400">Nenhuma reunião registada.</p>';
            renderAvisosView();
        }
        
        // --- Inicialização ---
        lucide.createIcons();
        await loadData();
        renderAll();
        navigateTo(window.location.hash || '#dashboard');
        loadingOverlay.style.display = 'none';

    } catch (error) {
         console.error("Erro ao inicializar o dashboard:", error);
        loadingOverlay.innerHTML = '<div class="text-center"><p class="text-red-500 font-semibold mb-2">Ocorreu um erro ao carregar o painel.</p><p class="text-gray-600">Verifique as credenciais do Firebase e a conexão com a internet.</p></div>';
    }
});
