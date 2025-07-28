// --- VARIÁVEIS GLOBAIS ---
let db, usuarioAtual = "", currentStep = 1, salarioChart, simulacaoResultados = {};
const EXPECTATIVA_SOBREVIDA_IBGE = { M: { 55: 25.5, 56: 24.7, 57: 23.9, 58: 23.1, 59: 22.3, 60: 21.6, 61: 20.8, 62: 20.1, 63: 19.4, 64: 18.7, 65: 18.0 }, F: { 52: 30.1, 53: 29.2, 54: 28.4, 55: 27.5, 56: 26.7, 57: 25.8, 58: 25.0, 59: 24.1, 60: 23.3, 61: 22.5, 62: 21.7 } };

// --- FUNÇÕES UTILITÁRIAS ---
function showToast(text, isSuccess = false) { Toastify({ text, duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true, style: { background: isSuccess ? "linear-gradient(to right, #00b09b, #96c93d)" : "linear-gradient(to right, #ff5f6d, #ffc371)", }}).showToast(); }
function toggleSpinner(button, show) { if (button) { button.disabled = show; button.classList.toggle('button-loading', show); } }
function formatarDinheiro(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarDataBR(v, plusDay = true) { if (!v) return ""; try { const date = new Date(v); if(plusDay) date.setDate(date.getDate() + 1); return date.toLocaleDateString('pt-BR'); } catch(e) { return v; } }
function formatarDataPorExtenso(data) {
    if (!data) return '';
    const [year, month, day] = data.split('-');
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1); 
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = date.toLocaleString('pt-BR', { month: 'long' });
    const ano = date.getFullYear();
    return `${dia} de ${mes} de ${ano}`;
}
function atualizarDataHora() {
    const container = document.getElementById('datetime-container');
    if (container) {
        const agora = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dataFormatada = agora.toLocaleDateString('pt-BR', options);
        const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        container.innerHTML = `🗓️ ${dataFormatada} | ⏰ ${horaFormatada}`;
    }
}


// --- NAVEGAÇÃO E CONTROLE DE UI ---
function handleNavClick(event, targetView) {
    if (event) event.preventDefault();
    
    document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`#main-nav a[onclick*="'${targetView}'"]`).classList.add('active');
    
    switch(targetView) {
        case 'dashboard': voltarDashboard(); break;
        case 'simulacao': iniciarNovaSimulacao(); break;
        case 'ctc': iniciarGeracaoCTC(); break;
        case 'legislacao': mostrarLegislacao(); break;
        case 'cadastro': mostrarCadastro(); break;
        case 'processos': mostrarProcessos(); break;
        case 'financeiro': mostrarFinanceiro(); break;
        case 'relatorios': mostrarRelatorios(); break;
        case 'usuarios': mostrarGerenciamentoUsuarios(); break;
    }
}

function showView(viewId) {
    const views = ['dashboard', 'calculadora', 'geradorCTC', 'telaLegislacao', 'telaCadastro', 'telaProcessos', 'telaFinanceiro', 'telaRelatorios', 'telaUsuarios'];
    views.forEach(id => {
        const viewElement = document.getElementById(id);
        if (viewElement) viewElement.style.display = 'none';
    });
    
    const view = document.getElementById(viewId);
    if (view) view.style.display = 'block';
}

function iniciarNovaSimulacao() { showView('calculadora'); limparFormularioCompleto(); irParaPasso(1); }
function iniciarGeracaoCTC() { showView('geradorCTC'); limparFormularioCTC(); }
function mostrarLegislacao() { showView('telaLegislacao'); }
function mostrarCadastro() { showView('telaCadastro'); }
function mostrarProcessos() { showView('telaProcessos'); }
function mostrarFinanceiro() { showView('telaFinanceiro'); }
function mostrarRelatorios() { showView('telaRelatorios'); }
function mostrarGerenciamentoUsuarios() { showView('telaUsuarios'); listarUsuarios(); }
function voltarDashboard() { showView('dashboard'); listarHistorico(); listarCTCsSalvas(); }


// --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => { initAuthDB(); });
function initAuthDB(){ const req = indexedDB.open("UsuariosRPPS", 1); req.onerror = () => console.error("Erro ao abrir IndexedDB"); req.onsuccess = (e) => { db = e.target.result; }; req.onupgradeneeded = (e) => { db = e.target.result; if (!db.objectStoreNames.contains("usuarios")){ const store = db.createObjectStore("usuarios", { keyPath: "usuario" }); store.add({ usuario: "admin", senha: "senha123" }); } }; }

function login(){ 
    const u = document.getElementById("usuario").value.trim();
    const s = document.getElementById("senha").value.trim();
    if(!u || !s) return showToast("Preencha todos os campos!");
    
    const tx = db.transaction("usuarios","readonly");
    const store = tx.objectStore("usuarios");
    const req = store.get(u);
    
    req.onsuccess = () => {
        if(req.result && req.result.senha === s){
            usuarioAtual = u;
            document.getElementById("usuarioLogado").innerText = u;
            document.getElementById("usuarioLogadoSidebar").innerText = u;
            document.getElementById("user-avatar").innerText = u.substring(0, 2).toUpperCase();

            document.getElementById("telaLogin").style.display = "none";
            document.querySelector(".app-container").style.display = "flex";
            document.getElementById("floating-buttons-container").style.display = "flex";
            initSistemaPosLogin();
        } else {
            showToast("Usuário ou senha incorretos.");
        }
    };
    req.onerror = () => showToast("Erro ao buscar usuário.");
}

function logout(){
    usuarioAtual = "";
    document.querySelector(".app-container").style.display = "none";
    document.getElementById("floating-buttons-container").style.display = "none";
    document.getElementById("telaLogin").style.display = "flex";
    document.getElementById("usuario").value = "";
    document.getElementById("senha").value = "";
    document.getElementById("mensagem").innerText = "";
}

function initSistemaPosLogin(){ 
    setupAccordion(); 
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000 * 60); 
    
    if (localStorage.getItem("temaEscuro") === "sim") { 
        document.body.classList.add('dark-mode'); 
        document.querySelector("#toggleTheme i").className = 'ri-sun-line';
    } else { 
        document.body.classList.remove('dark-mode');
        document.querySelector("#toggleTheme i").className = 'ri-moon-line';
    } 
    
    handleNavClick(null, 'dashboard');
}

// --- GERENCIAMENTO DE USUÁRIOS ---
function cadastrarUsuario(event) {
    event.preventDefault();
    const nomeInput = document.getElementById('novoUsuarioNome');
    const senhaInput = document.getElementById('novoUsuarioSenha');
    const nome = nomeInput.value.trim();
    const senha = senhaInput.value.trim();

    if (!nome || !senha) {
        showToast("Preencha o nome de usuário e a senha.");
        return;
    }

    const tx = db.transaction("usuarios", "readwrite");
    const store = tx.objectStore("usuarios");
    const request = store.add({ usuario: nome, senha: senha });

    request.onsuccess = () => {
        showToast(`Usuário "${nome}" cadastrado com sucesso!`, true);
        nomeInput.value = '';
        senhaInput.value = '';
        listarUsuarios();
    };

    request.onerror = (e) => {
        if (e.target.error.name === 'ConstraintError') {
            showToast(`Erro: O usuário "${nome}" já existe.`);
        } else {
            showToast("Ocorreu um erro ao cadastrar o usuário.");
        }
    };
}

function listarUsuarios() {
    const tbody = document.getElementById('corpo-tabela-usuarios');
    if(!tbody) return;
    tbody.innerHTML = '';

    const tx = db.transaction("usuarios", "readonly");
    const store = tx.objectStore("usuarios");
    const request = store.openCursor();

    request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            const linha = document.createElement('tr');
            
            const celulaUsuario = document.createElement('td');
            celulaUsuario.textContent = cursor.value.usuario;
            linha.appendChild(celulaUsuario);
            
            const celulaAcoes = document.createElement('td');
            if (cursor.value.usuario !== 'admin') {
                const btnExcluir = document.createElement('button');
                btnExcluir.innerHTML = '<i class="ri-delete-bin-line"></i> Excluir';
                btnExcluir.className = 'danger';
                btnExcluir.style.margin = 0;
                btnExcluir.style.display = 'flex';
                btnExcluir.style.alignItems = 'center';
                btnExcluir.style.gap = '5px';
                btnExcluir.onclick = () => excluirUsuario(cursor.value.usuario);
                celulaAcoes.appendChild(btnExcluir);
            } else {
                celulaAcoes.innerHTML = '<span style="color: var(--text-secondary-color); font-style: italic;">Protegido</span>';
            }
            linha.appendChild(celulaAcoes);

            tbody.appendChild(linha);
            cursor.continue();
        }
    };
    
    request.onerror = () => {
        showToast("Erro ao listar os usuários.");
    };
}

function excluirUsuario(nomeUsuario) {
    if (nomeUsuario === 'admin') {
        showToast("O usuário 'admin' não pode ser excluído.");
        return;
    }
    if (!confirm(`Tem certeza que deseja excluir o usuário "${nomeUsuario}"?`)) {
        return;
    }

    const tx = db.transaction("usuarios", "readwrite");
    const store = tx.objectStore("usuarios");
    const request = store.delete(nomeUsuario);

    request.onsuccess = () => {
        showToast(`Usuário "${nomeUsuario}" excluído com sucesso.`, true);
        listarUsuarios();
    };

    request.onerror = () => {
        showToast("Erro ao excluir o usuário.");
    };
}

// --- LÓGICA DE UI E SIMULAÇÃO ---
function irParaPasso(passo){ 
    if (passo > currentStep && currentStep === 1){
        if (!document.getElementById('dataAdmissao').value || !document.getElementById('dataNascimento').value){
            return showToast('Preencha a Data de Admissão e Nascimento para continuar.');
        }
    }
    const tipo = document.getElementById('tipoBeneficio').value;
    if(passo === 2 && tipo === 'pensao_aposentado') {
        calcularBeneficio(true, null);
        return; 
    }
    currentStep = passo;
    document.querySelectorAll('.wizard-step').forEach(step => step.style.display = 'none');
    document.getElementById('passo'+passo).style.display = 'block';
    window.scrollTo(0,0);
}

function alternarCamposBeneficio(){
    const tipo = document.getElementById('tipoBeneficio').value;
    const isAposentadoria = (tipo === 'voluntaria' || tipo === 'incapacidade');
    const isPensao = (tipo === 'pensao_ativo' || tipo === 'pensao_aposentado');
    
    document.getElementById('camposIncapacidade').style.display = (tipo === 'incapacidade') ? 'grid' : 'none';
    document.getElementById('camposPensaoAtivo').style.display = (tipo === 'pensao_ativo') ? 'block' : 'none';
    document.getElementById('camposPensaoAposentado').style.display = (tipo === 'pensao_aposentado') ? 'grid' : 'none';
    document.getElementById('containerGestaoDependentes').style.display = isPensao ? 'block' : 'none';
    
    const containerDependentes = document.getElementById('containerGestaoDependentes');
    if (tipo === 'pensao_ativo') {
        document.getElementById('camposPensaoAtivo').appendChild(containerDependentes);
    } else if (tipo === 'pensao_aposentado') {
        document.getElementById('camposPensaoAposentado').appendChild(containerDependentes);
    }

    document.getElementById('camposAtoAposentadoria').style.display = isAposentadoria ? 'block' : 'none';
    document.getElementById('camposAtoPensao').style.display = isPensao ? 'block' : 'none';
    document.getElementById('containerDetalhamentoProventos').style.display = isAposentadoria ? 'block' : 'none';

    const passo2 = document.getElementById('passo2');
    if (passo2) {
        const isVisible = (tipo === 'pensao_aposentado') ? 'none' : (currentStep === 2 ? 'block' : 'none');
        passo2.style.display = isVisible;
    }
}

function limparFormularioCompleto(){ 
    document.querySelectorAll('#calculadora input[type="text"],#calculadora input[type="date"],#calculadora input[type="number"], #calculadora textarea').forEach(i=>i.value=''); 
    document.getElementById('corpo-tabela').innerHTML='';
    document.getElementById('resultado').innerHTML=''; 
    document.getElementById('resultadoProjecao').innerHTML=''; 
    document.getElementById('resultadoAbono').innerHTML='';
    document.getElementById('resultadoLiquido').innerHTML='';
    simulacaoResultados = {}; 
    if (salarioChart) salarioChart.destroy(); 
    
    const hoje = new Date().toISOString().split('T')[0]; 
    document.getElementById("dataCalculo").value = hoje; 
    document.getElementById("dataRequerimento").value = hoje; 
    document.getElementById("tempoExterno").value = "0"; 
    document.getElementById("tempoEspecial").value = "0"; 
    
    document.getElementById('corpo-tabela-proventos-ato').innerHTML = ''; 
    calculateTotalProventos(); 
    document.getElementById('corpo-tabela-dependentes').innerHTML = ''; 
    document.getElementById('fundamentoLegalPersonalizado').value = 'com fundamento no art. 40 §3º da CF/88 (redação dada pela EC n.º 103/19), e nas Leis Municipais n.º 205/94, em seu art. 67; Lei n.º 080/17 que altera a Lei n.º 066/17; Decreto Municipal nº. 113/2022, art. 21, §4º, incisos I, II, III, §5º, §6º, I, “b”, art. 4º, inciso I, da Lei 035/2022, bem como, EC 103/2019'; 
    adicionarLinhaProvento('Salário Base', ''); 
    adicionarLinhaProvento('Anuênio 25%', ''); 
    adicionarLinhaProvento('Indenização 20% Lei n.º 066/2017', ''); 
    adicionarLinhaProvento('Especialização L.033/07-A.26', ''); 
    adicionarLinhaProvento('Vantagem Pessoal Nominalmente Identificada - VPNI', ''); 
    
    const accToggle = document.querySelector('#passo2 .accordion-toggle'), accContent = document.querySelector('#passo2 .accordion-content'); 
    if (accToggle && accContent) { 
        accToggle.classList.remove('active'); 
        accContent.style.maxHeight = null; 
    } 
}

function alternarTema(){ 
    const isDarkMode = document.body.classList.toggle("dark-mode"); 
    document.querySelector("#toggleTheme i").className = isDarkMode ? 'ri-sun-line' : 'ri-moon-line';
    localStorage.setItem("temaEscuro", isDarkMode ? "sim" : "nao"); 
    if (salarioChart) {
        calcularBeneficio(false); 
    }
}

function setupAccordion() { const toggle = document.querySelector("#passo2 .accordion-toggle"); if (toggle) { toggle.addEventListener("click", () => { toggle.classList.toggle("active"); const content = toggle.nextElementSibling; content.style.maxHeight = content.style.maxHeight ? null : content.scrollHeight + "px"; }); } }

function configurarValidadores(){ const cpfInput = document.getElementById('cpfServidor'), cpfStatus = document.getElementById('cpf-status'); cpfInput.addEventListener('input',(e)=>{ const cpf = e.target.value; if(cpf.length>0){ if(validaCPF(cpf)){ cpfInput.style.borderColor = 'var(--success-color)'; cpfStatus.textContent='CPF Válido'; cpfStatus.style.color = 'var(--success-color)'; }else{ cpfInput.style.borderColor = 'var(--danger-color)'; cpfStatus.textContent='CPF Inválido'; cpfStatus.style.color = 'var(--danger-color)'; } }else{ cpfInput.style.borderColor = 'var(--border-color)'; cpfStatus.textContent=''; } }); }

function validaCPF(cpf){ cpf = String(cpf).replace(/[^\d]/g,''); if (cpf.length!==11 || /^(\d)\1{10}$/.test(cpf)) return false; let soma=0,resto; for(let i=1;i<=9;i++) soma += parseInt(cpf.substring(i-1,i))*(11-i); resto = (soma*10)%11; if((resto===10)||(resto===11)) resto=0; if(resto!==parseInt(cpf.substring(9,10))) return false; soma=0; for(let i=1;i<=10;i++) soma += parseInt(cpf.substring(i-1,i))*(12-i); resto = (soma*10)%11; if((resto===10)||(resto===11)) resto=0; if(resto!==parseInt(cpf.substring(10,11))) return false; return true; }

// --- FUNÇÕES DA TABELA DE SALÁRIOS ---
function adicionarLinha(mes='',fator='',salario=''){ const tbody = document.getElementById("corpo-tabela"), linha = document.createElement("tr"); linha.innerHTML = `<td>${tbody.rows.length + 1}</td><td><input type="text" placeholder="MM/AAAA" value="${mes}" /></td><td><input type="number" step="0.000001" class="fator" value="${fator}" /></td><td><input type="number" step="0.01" class="salario" value="${salario}" /></td><td><input type="number" class="atualizado" readonly /></td><td><button class="danger" style="margin:0; padding: 5px;" onclick="excluirLinha(this)">Excluir</button></td>`; tbody.appendChild(linha); const accContent = document.querySelector('#passo2 .accordion-content'); if (accContent && accContent.style.maxHeight) { accContent.style.maxHeight = accContent.scrollHeight + "px"; } }
function limparTabela(){ if(confirm("Tem certeza que deseja limpar todos os salários?")){ document.getElementById("corpo-tabela").innerHTML=""; } }
function excluirLinha(btn) { btn.closest('tr').remove(); renumerarLinhasTabela(); }
function renumerarLinhasTabela() { const linhas = document.querySelectorAll("#corpo-tabela tr"); linhas.forEach((linha, index) => { linha.cells[0].textContent = index + 1; }); }

// --- FUNÇÕES DA TABELA DE PROVENTOS ---
function adicionarLinhaProvento(descricao = '', valor = '') { const tbody = document.getElementById("corpo-tabela-proventos-ato"); const linha = document.createElement("tr"); linha.innerHTML = `<td><input type="text" class="provento-descricao" placeholder="Descrição do provento" value="${descricao}" /></td><td><input type="number" step="0.01" class="provento-valor" placeholder="0.00" value="${valor}" oninput="calculateTotalProventos()" /></td><td><button class="danger" style="margin:0; padding: 5px;" onclick="excluirLinhaProvento(this)">Excluir</button></td>`; tbody.appendChild(linha); }
function excluirLinhaProvento(btn) { btn.closest('tr').remove(); calculateTotalProventos(); }
function calculateTotalProventos() { const valoresInputs = document.querySelectorAll("#corpo-tabela-proventos-ato .provento-valor"); let total = 0; valoresInputs.forEach(input => { total += parseFloat(input.value) || 0; }); document.getElementById('total-proventos-ato').innerText = formatarDinheiro(total); simulacaoResultados.valorBeneficioFinal = total; return total; }

// --- FUNÇÕES DA TABELA DE DEPENDENTES ---
function adicionarLinhaDependente(nome = '', dataNasc = '', parentesco = '', invalido = 'Nao') { const tbody = document.getElementById('corpo-tabela-dependentes'); const linha = document.createElement('tr'); linha.innerHTML = `<td><input type="text" class="dependente-nome" value="${nome}"></td><td><input type="date" class="dependente-dataNasc" value="${dataNasc}"></td><td><select class="dependente-parentesco"><option ${parentesco === 'Cônjuge' ? 'selected' : ''}>Cônjuge</option><option ${parentesco === 'Companheiro(a)' ? 'selected' : ''}>Companheiro(a)</option><option ${parentesco === 'Filho(a)' ? 'selected' : ''}>Filho(a)</option><option ${parentesco === 'Filho(a) Inválido(a)' ? 'selected' : ''}>Filho(a) Inválido(a)</option><option ${parentesco === 'Mãe' ? 'selected' : ''}>Mãe</option><option ${parentesco === 'Pai' ? 'selected' : ''}>Pai</option></select></td><td><select class="dependente-invalido"><option value="Nao" ${invalido === 'Nao' ? 'selected' : ''}>Não</option><option value="Sim" ${invalido === 'Sim' ? 'selected' : ''}>Sim</option></select></td><td><button class="danger" style="margin:0; padding: 5px;" onclick="removerLinhaDependente(this)">Remover</button></td>`; tbody.appendChild(linha); }
function removerLinhaDependente(btn) { btn.closest('tr').remove(); }


// --- CÁLCULO PRINCIPAL DO BENEFÍCIO ---
function calcularMediaSalarial(){ const salariosInputs = document.querySelectorAll("#corpo-tabela .salario"), fatoresInputs = document.querySelectorAll("#corpo-tabela .fator"), atualizadosOutputs = document.querySelectorAll("#corpo-tabela .atualizado"); let salariosParaMedia = []; for(let i=0;i<salariosInputs.length;i++){ const salario = parseFloat(salariosInputs[i].value), fator = parseFloat(fatoresInputs[i].value), mes = document.querySelectorAll("#corpo-tabela tr")[i].querySelectorAll("input[type='text']")[0].value; if(fator>0 && salario>0 && /^\d{2}\/\d{4}$/.test(mes)){ const atualizado = salario * fator; atualizadosOutputs[i].value = atualizado.toFixed(2); salariosParaMedia.push({label:mes,value:atualizado}); }else{ atualizadosOutputs[i].value = ''; } } if (salariosParaMedia.length === 0) return {media:0,salarios:[]}; const media = salariosParaMedia.reduce((acc,s)=>acc+s.value,0)/salariosParaMedia.length; return {media,salarios:salariosParaMedia}; }
function calcularBeneficio(navegar=true, btn=null){
    const tipo = document.getElementById('tipoBeneficio').value;
    if (tipo === 'voluntaria') {
        const dataNasc = document.getElementById('dataNascimento').value;
        const dataAdm = document.getElementById('dataAdmissao').value;
        if (!dataNasc || !dataAdm) {
            showToast("Para Aposentadoria Voluntária, a Data de Nascimento e a Data de Admissão (Passo 1) são obrigatórias.");
            return; 
        }
    }
    toggleSpinner(btn, true); 
    setTimeout(() => { 
        try { 
            const resultadoDiv = document.getElementById('resultado'); 
            let valorBeneficio = 0, descricaoCalculo = '', media = 0, salarios = []; 
            simulacaoResultados = {}; 
            if (tipo !== 'pensao_aposentado') { 
                const mediaResult = calcularMediaSalarial(); 
                media = mediaResult.media; 
                salarios = mediaResult.salarios; 
            } 
            const isAposentadoria = (tipo === 'voluntaria' || tipo === 'incapacidade'); 
            const isPensao = (tipo === 'pensao_ativo' || tipo === 'pensao_aposentado'); 
            if (isAposentadoria) { 
                valorBeneficio = calculateTotalProventos(); 
                descricaoCalculo = `O valor do benefício é composto pelo somatório dos proventos detalhados na tabela específica. A média dos salários de contribuição (${formatarDinheiro(media)}) serve como base para projeções e conferência.`; 
                if (tipo === 'voluntaria') { 
                    projetarAposentadoria(media); 
                    verificarAbonoPermanencia(); 
                } 
            } else { 
                const numDependentes = document.getElementById('corpo-tabela-dependentes').rows.length; 
                const percentual = Math.min(0.50 + (numDependentes * 0.10), 1.0); 
                if (tipo === 'pensao_ativo'){ 
                    valorBeneficio = media * percentual; 
                    descricaoCalculo = `Cota de ${(percentual*100).toFixed(0)}% (50% familiar + ${numDependentes * 10}% por dependente) aplicada sobre a média salarial do servidor ativo.`; 
                } else if (tipo === 'pensao_aposentado'){ 
                    const proventoBruto = parseFloat(document.getElementById('proventoAposentado').value) || 0; 
                    valorBeneficio = proventoBruto * percentual; 
                    descricaoCalculo = `Cota de ${(percentual * 100).toFixed(0)}% (50% familiar + ${numDependentes * 10}% por dependente) aplicada sobre o provento de ${formatarDinheiro(proventoBruto)} do instituidor aposentado.`; 
                } 
            } 
            simulacaoResultados = { ...simulacaoResultados, mediaSalarial: media, valorBeneficioFinal: valorBeneficio, tipo: document.querySelector("#tipoBeneficio option:checked").text, descricao: descricaoCalculo }; 
            resultadoDiv.innerHTML = `<h3>Resultado do Cálculo (Bruto)</h3> <p><b>Tipo de Benefício:</b> ${simulacaoResultados.tipo}</p> ${media > 0 ? `<p><b>Média Salarial de Contribuição:</b> ${formatarDinheiro(simulacaoResultados.mediaSalarial)}</p>` : ''} <p><b>Descrição do Cálculo:</b> ${simulacaoResultados.descricao}</p> <p style="font-size:1.2em;font-weight:bold;">💰 Valor Bruto do Benefício: ${formatarDinheiro(simulacaoResultados.valorBeneficioFinal)}</p>`; 
            calculateValorLiquido(valorBeneficio); 
            document.getElementById('containerAtoAposentadoriaBtn').style.display = isAposentadoria ? 'block' : 'none'; 
            document.getElementById('containerAtoPensaoBtn').style.display = isPensao ? 'block' : 'none'; 
            if (salarios.length > 0) desenharGrafico(salarios,media); 
            if(navegar) irParaPasso(3); 
        } finally { 
            toggleSpinner(btn, false); 
        } 
    }, 50); 
}


// --- FUNÇÕES DE CTC ---
function salvarCTC() { const nome = prompt("Informe um nome para salvar esta CTC:"); if (!nome) return; const ctc = { id: crypto.randomUUID(), nome, dados: { nomeServidor: document.getElementById('ctc-nomeServidor').value, matricula: document.getElementById('ctc-matricula').value, cpf: document.getElementById('ctc-cpf').value, rg: document.getElementById('ctc-rg').value, dataNascimento: document.getElementById('ctc-dataNascimento').value, sexo: document.getElementById('ctc-sexo').value, cargo: document.getElementById('ctc-cargo').value, lotacao: document.getElementById('ctc-lotacao').value, dataAdmissao: document.getElementById('ctc-dataAdmissao').value, dataExoneracao: document.getElementById('ctc-dataExoneracao').value, processo: document.getElementById('ctc-processo').value, periodos: Array.from(document.querySelectorAll("#corpo-tabela-periodos-ctc tr")).map(linha => ({ inicio: linha.querySelector('.ctc-inicio').value, fim: linha.querySelector('.ctc-fim').value, deducoes: linha.querySelector('.ctc-deducoes').value, fonte: linha.querySelector('.ctc-fonte').value })) } }; const ctcs = JSON.parse(localStorage.getItem("ctcs_salvas") || "[]"); ctcs.unshift(ctc); localStorage.setItem("ctcs_salvas", JSON.stringify(ctcs)); listarCTCsSalvas(); showToast("CTC salva com sucesso!", true); }
function listarCTCsSalvas() { const lista = document.getElementById("listaCTCsSalvas"); if(!lista) return; const ctcs = JSON.parse(localStorage.getItem("ctcs_salvas") || "[]"); lista.innerHTML = ""; if (ctcs.length === 0) { lista.innerHTML = "<li>Nenhuma CTC salva ainda.</li>"; return; } ctcs.forEach(ctc => { const li = document.createElement("li"); li.innerHTML = `<div class="item-info"><span>${ctc.nome}</span><small>Servidor(a): ${ctc.dados.nomeServidor || 'Não informado'}</small></div><div class="item-actions"><button onclick="carregarCTC('${ctc.id}')" title="Carregar CTC"><i class="ri-folder-open-line"></i></button><button class="danger" onclick="excluirCTC('${ctc.id}')" title="Excluir CTC"><i class="ri-delete-bin-line"></i></button></div>`; lista.appendChild(li); }); }
function carregarCTC(id) { const ctcs = JSON.parse(localStorage.getItem("ctcs_salvas") || "[]"); const ctc = ctcs.find(c => c.id === id); if (!ctc) return; handleNavClick(null, 'ctc'); setTimeout(() => { const d = ctc.dados; document.getElementById('ctc-nomeServidor').value = d.nomeServidor; document.getElementById('ctc-matricula').value = d.matricula; document.getElementById('ctc-cpf').value = d.cpf; document.getElementById('ctc-rg').value = d.rg; document.getElementById('ctc-dataNascimento').value = d.dataNascimento; document.getElementById('ctc-sexo').value = d.sexo; document.getElementById('ctc-cargo').value = d.cargo; document.getElementById('ctc-lotacao').value = d.lotacao; document.getElementById('ctc-dataAdmissao').value = d.dataAdmissao; document.getElementById('ctc-dataExoneracao').value = d.dataExoneracao; document.getElementById('ctc-processo').value = d.processo; const tbody = document.getElementById('corpo-tabela-periodos-ctc'); tbody.innerHTML = ''; if(d.periodos) { d.periodos.forEach(p => adicionarLinhaPeriodoCTC(p.inicio, p.fim, p.deducoes, p.fonte)); } calcularTempoPeriodosCTC(); showToast(`CTC "${ctc.nome}" carregada.`, true); }, 100); }
function excluirCTC(id) { if (!confirm("Deseja excluir esta CTC?")) return; let ctcs = JSON.parse(localStorage.getItem("ctcs_salvas") || "[]"); ctcs = ctcs.filter(c => c.id !== id); localStorage.setItem("ctcs_salvas", JSON.stringify(ctcs)); listarCTCsSalvas(); showToast("CTC excluída com sucesso.", true); }
function limparFormularioCTC() { document.querySelectorAll('#geradorCTC input, #geradorCTC select').forEach(i => i.value = ''); document.getElementById('corpo-tabela-periodos-ctc').innerHTML = ''; calcularTempoTotalCTC(); }
function adicionarLinhaPeriodoCTC(inicio = '', fim = '', deducoes = '0', fonte = '') { const tbody = document.getElementById('corpo-tabela-periodos-ctc'); const linha = document.createElement('tr'); linha.innerHTML = `<td><input type="date" class="ctc-inicio" onchange="calcularTempoPeriodosCTC()" value="${inicio}"></td><td><input type="date" class="ctc-fim" onchange="calcularTempoPeriodosCTC()" value="${fim}"></td><td><input type="number" class="ctc-bruto" readonly></td><td><input type="number" class="ctc-deducoes" value="${deducoes}" oninput="calcularTempoPeriodosCTC()"></td><td><input type="number" class="ctc-liquido" readonly></td><td><input type="text" class="ctc-fonte" value="${fonte}" placeholder="Ex: ITAPREV"></td><td><button class="danger" style="margin:0; padding: 5px;" onclick="removerLinhaPeriodoCTC(this)">Remover</button></td>`; tbody.appendChild(linha); }
function removerLinhaPeriodoCTC(btn) { btn.closest('tr').remove(); calcularTempoTotalCTC(); }
function calcularTempoPeriodosCTC() { const linhas = document.querySelectorAll("#corpo-tabela-periodos-ctc tr"); linhas.forEach(linha => { const inicioEl = linha.querySelector('.ctc-inicio'); const fimEl = linha.querySelector('.ctc-fim'); const brutoEl = linha.querySelector('.ctc-bruto'); const deducoesEl = linha.querySelector('.ctc-deducoes'); const liquidoEl = linha.querySelector('.ctc-liquido'); if (inicioEl.value && fimEl.value) { const inicio = new Date(inicioEl.value + 'T00:00:00'); const fim = new Date(fimEl.value + 'T00:00:00'); if (fim >= inicio) { const diffTime = Math.abs(fim - inicio); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; brutoEl.value = diffDays; const deducoes = parseInt(deducoesEl.value) || 0; liquidoEl.value = diffDays - deducoes; } else { brutoEl.value = 0; liquidoEl.value = 0; } } else { brutoEl.value = ''; liquidoEl.value = ''; } }); calcularTempoTotalCTC(); }
function calcularTempoTotalCTC() { const temposLiquidos = document.querySelectorAll("#corpo-tabela-periodos-ctc .ctc-liquido"); let totalDias = 0; temposLiquidos.forEach(input => { totalDias += parseInt(input.value) || 0; }); const { anos, meses, dias } = diasParaAnosMesesDias(totalDias); document.getElementById('total-tempo-ctc').innerHTML = `Total: <b>${totalDias}</b> dias<br><small>(${anos} ano(s), ${meses} mes(es), ${dias} dia(s))</small>`; return totalDias; }
function diasParaAnosMesesDias(totalDias) { if (isNaN(totalDias) || totalDias < 0) return { anos: 0, meses: 0, dias: 0 }; let dias = Math.floor(totalDias); const anos = Math.floor(dias / 365); dias %= 365; const meses = Math.floor(dias / 30); dias %= 30; return { anos, meses, dias }; }


// --- GERAÇÃO DE ATOS E DOCUMENTOS ---
function valorPorExtenso(valor) { if (typeof valor === 'number') valor = String(valor.toFixed(2)); valor = valor.replace('.',','); if (valor.indexOf(',') === -1) valor += ',00'; let inteiros = valor.split(',')[0]; const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"]; const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"]; const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"]; const milharClasses = ["", "mil", "milhão", "bilhão", "trilhão"]; function numeroParaExtenso(n) { if (n == 0) return ""; let nStr = String(n).padStart(3, '0'); if (nStr == '100') return "cem"; let extenso = []; if (nStr[0] !== '0') extenso.push(centenas[parseInt(nStr[0])]); let dezenaUnidade = parseInt(nStr.substring(1)); if (dezenaUnidade > 0) { if (dezenaUnidade < 20) { extenso.push(unidades[dezenaUnidade]); } else { if (nStr[1] !== '0') extenso.push(dezenas[parseInt(nStr[1])]); if (nStr[2] !== '0') extenso.push(unidades[parseInt(nStr[2])]); } } return extenso.join(" e "); } let extensoFinal = []; if (inteiros == '0') { return "zero"; } else { let grupos = []; while (inteiros.length > 0) { grupos.push(inteiros.slice(-3)); inteiros = inteiros.slice(0, -3); } for (let i = grupos.length - 1; i >= 0; i--) { let grupoInt = parseInt(grupos[i]); if (grupoInt > 0) { let extensoGrupo = numeroParaExtenso(grupoInt); if (i > 0) { extensoGrupo += " " + milharClasses[i] + (grupoInt > 1 ? (i === 1 ? '' : (i === 2 ? 'ões' : 's')) : ''); } extensoFinal.push(extensoGrupo); } } return extensoFinal.join(" e "); } }
function gerarAtoDePensao(btn) { toggleSpinner(btn, true); try { const dados = { atoNumero: document.getElementById('atoNumero').value || '____', atoAno: new Date().getFullYear(), processo: document.getElementById('processoAdministrativo').value || '____', nomePensionista: document.getElementById('nomePensionista').value.toUpperCase() || '________________', relacaoPensionista: document.getElementById('relacaoPensionista').value.toLowerCase() || '________________', statusServidor: document.getElementById('tipoBeneficio').value === 'pensao_aposentado' ? 'inativo(a)' : 'ativo(a)', nomeServidor: document.getElementById('nomeServidor').value.toUpperCase() || '________________', cargoServidor: document.getElementById('cargoServidor').value.toUpperCase() || '________________', cpfServidor: document.getElementById('cpfServidor').value || '________________', matriculaServidor: document.getElementById('matriculaServidor').value || '________________', dataObito: formatarDataBR(document.getElementById('dataObito').value, false) || '__/__/____', valorBeneficio: simulacaoResultados.valorBeneficioFinal || 0, dataAtual: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), nomeDiretor: 'PREFEITO MUNICIPAL' }; const valorExtenso = valorPorExtenso(dados.valorBeneficio) + " reais"; const valorFormatado = formatarDinheiro(dados.valorBeneficio); const dataVigencia = dados.dataObito; const estilo = `<style>body{font-family:'Times New Roman',Times,serif;color:black;background-color:white;line-height:1.5;font-size:12pt;margin:0;padding:20mm;}.container{width:210mm;min-height:297mm;box-sizing:border-box;}.center{text-align:center;}.bold{font-weight:bold;}.uppercase{text-transform:uppercase;}.justify{text-align:justify;}.indent{text-indent:50px;}p,h3{margin:0;}.header p{margin-bottom:5px;}h3.title{margin-top:40px;border:none;font-weight:bold;}p.considerando{margin-top:50px;}h3.resolve{text-align:center;font-weight:bold;margin-top:40px;margin-bottom:30px;border:none;}p.artigo{margin-top:15px;}p.cumpra-se{text-align:center;margin-top:60px;}p.data-local{text-align:center;margin-top:40px;}.assinatura{text-align:center;margin-top:80px;}@media print{body{padding:0;}}</style>`; const conteudoHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ato de Pensão Nº ${dados.atoNumero}/${dados.atoAno}</title>${estilo}</head><body><div class="container"><div class="center header"><p class="bold">PREFEITURA MUNICIPAL DE ITAPIPOCA</p><p class="bold">INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA – ITAPREV</p><h3 class="title">ATO DE PENSÃO Nº ${dados.atoNumero}/${dados.atoAno}</h3></div><p class="justify indent considerando">O DIRETOR PRESIDENTE DO INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA – ITAPREV, no uso de suas atribuições legais, conferidas pela Lei Orgânica do Município e pela Lei Municipal nº 047/2008, e</p><p class="justify indent">CONSIDERANDO o requerimento formulado pelo(a) interessado(a), que deu origem ao Processo Administrativo nº <span class="bold">${dados.processo}</span>,</p><h3 class="resolve">RESOLVE:</h3><p class="justify indent artigo"><b>Art. 1º</b> - CONCEDER o benefício de <b>PENSÃO POR MORTE</b>, ao(à) pensionista <b class="uppercase">${dados.nomePensionista}</b>, na qualidade de <b class="uppercase">${dados.relacaoPensionista}</b> do(a) ex-servidor(a) ${dados.statusServidor}, <b class="uppercase">${dados.nomeServidor}</b>, ocupante do cargo de <b class="uppercase">${dados.cargoServidor}</b>, CPF nº <b>${dados.cpfServidor}</b>, Matrícula nº <b>${dados.matriculaServidor}</b>, falecido(a) em <b>${dados.dataObito}</b>.</p><p class="justify indent artigo"><b>Art. 2º</b> - O valor do benefício corresponderá à cota familiar de 50% (cinquenta por cento), acrescida de cotas de 10% (dez por cento) por dependente, até o máximo de 100% (cem por cento), aplicada sobre o valor dos proventos do servidor falecido, totalizando <b>${valorFormatado}</b> (<span class="bold uppercase">${valorExtenso}</span>).</p><p class="justify indent artigo"><b>Art. 3º</b> - A presente pensão tem como fundamento legal o Art. 23 da Emenda Constitucional nº 103/2019 e os Arts. 45 a 52 da Lei Municipal nº 047/2008.</p><p class="justify indent artigo"><b>Art. 4º</b> - Este ato entra em vigor na data de sua publicação, com efeitos financeiros a partir de <b>${dataVigencia}</b>, data do óbito do instituidor.</p><p class="cumpra-se">REGISTRE-SE, PUBLIQUE-SE E CUMPRA-SE.</p><p class="data-local">Itapipoca-CE, ${dados.dataAtual}.</p><div class="assinatura"><p class="bold uppercase">${dados.nomeDiretor}</p><p>Diretor Presidente do ITAPREV</p></div></div></body></html>`; const novaAba = window.open(); novaAba.document.open(); novaAba.document.write(conteudoHtml); novaAba.document.close(); showToast("Documento gerado em nova aba. Use a função de imprimir (Ctrl+P) para salvar como PDF.", true); } catch (e) { showToast("Ocorreu um erro ao gerar o documento."); console.error("Erro na geração do ato de pensão:", e); } finally { toggleSpinner(btn, false); } }

function gerarAtoDeAposentadoria(btn) {
    toggleSpinner(btn, true);
    try {
        const sexo = document.getElementById('sexo').value;
        const totalProventos = calculateTotalProventos();
        const tipoBeneficio = document.getElementById('tipoBeneficio').value;

        const dados = {
            atoNumero: document.getElementById('atoNumeroAposentadoria').value.padStart(3, '0') || '___',
            atoAno: new Date().getFullYear(),
            nomeServidor: document.getElementById('nomeServidor').value.toUpperCase() || '________________',
            nacionalidade: sexo === 'F' ? 'brasileira' : 'brasileiro',
            rg: document.getElementById('rgServidor').value || '________________',
            cpf: document.getElementById('cpfServidor').value || '________________',
            matricula: document.getElementById('matriculaServidor').value || '________________',
            cargaHoraria: document.getElementById('cargaHorariaServidor').value || '________________',
            cargo: document.getElementById('cargoServidor').value.toUpperCase() || '________________',
            lotacao: document.getElementById('lotacaoServidor').value.toUpperCase() || '________________',
            admissao: formatarDataBR(document.getElementById('dataAdmissao').value, true) || '__/__/____',
            fundamentoLegal: document.getElementById('fundamentoLegalPersonalizado').value.replace(/\n/g, '<br>') || '________________',
            dataAtual: formatarDataPorExtenso(document.getElementById('dataCalculo').value) || formatarDataPorExtenso(new Date().toISOString().split('T')[0]),
        };

        let tituloAto = '';
        let paragrafoResolve = '';

        if (tipoBeneficio === 'voluntaria') {
            tituloAto = 'ATO CONCESSIVO DE APOSENTADORIA VOLUNTÁRIA';
            paragrafoResolve = `APOSENTAR VOLUNTARIAMENTE A SERVIDORA PÚBLICA <b class="uppercase">${dados.nomeServidor}</b>`;
        } else if (tipoBeneficio === 'incapacidade') {
            tituloAto = 'ATO CONCESSIVO DE APOSENTADORIA POR INCAPACIDADE PERMANENTE';
            const incapacidadeGrave = document.getElementById('incapacidadeGrave').value;
            const tipoProvento = (incapacidadeGrave === 'sim') ? 'COM PROVENTOS INTEGRAIS' : 'COM PROVENTOS PROPORCIONAIS';
            paragrafoResolve = `APOSENTAR POR INCAPACIDADE PERMANENTE, ${tipoProvento}, A SERVIDORA PÚBLICA <b class="uppercase">${dados.nomeServidor}</b>`;
        }

        const valorFormatado = formatarDinheiro(totalProventos);
        const totalPorExtenso = valorPorExtenso(totalProventos);
        let proventosHtmlTableRows = '';
        const proventosLinhas = document.querySelectorAll("#corpo-tabela-proventos-ato tr");
        proventosLinhas.forEach(linha => {
            const descricao = linha.querySelector('.provento-descricao').value || '';
            const valor = parseFloat(linha.querySelector('.provento-valor').value) || 0;
            if (descricao && valor > 0) {
                proventosHtmlTableRows += `<tr><td>${descricao}</td><td>${formatarDinheiro(valor)}</td></tr>`;
            }
        });

        const estilo = `<style>body { font-family: 'Times New Roman', Times, serif; color: black; background-color: white; line-height: 1.5; font-size: 12pt; margin: 0; padding: 20mm; } .container { width: 210mm; min-height: 297mm; box-sizing: border-box; } .center { text-align: center; } .bold { font-weight: bold; } .uppercase { text-transform: uppercase; } .justify { text-align: justify; } .header { margin-bottom: 25px; } h4.title { margin: 0; font-weight: bold; } p { margin: 1em 0; } .resolve-text { margin-top: 25px; } .proventos-table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid black; } .proventos-table th, .proventos-table td { border: 1px solid black; padding: 5px; } .proventos-table th { background-color: #e0e0e0; text-align: center; } .proventos-table td:last-child { text-align: right; } .proventos-table tfoot td { font-weight: bold; } .signature-block { margin-top: 80px; text-align: center; } .signature-block p { margin: 0; line-height: 1.2; } @media print { body { padding: 0; } }</style>`;
        const conteudoHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ato de Aposentadoria Nº ${dados.atoNumero}/${dados.atoAno}</title>${estilo}</head><body><div class="container"><div class="center header"><h4 class="title uppercase">${tituloAto} N.º ${dados.atoNumero}/${dados.atoAno}.</h4></div><p class="justify">O PREFEITO MUNICIPAL DE ITAPIPOCA, no uso de suas atribuições legais, que lhe confere a Lei Orgânica do Município de Itapipoca e a Presidente do Instituto de Previdência do Município de Itapipoca – ITAPREV, no uso de suas atribuições conferidas,</p><h4 class="center uppercase">RESOLVEM:</h4><p class="justify resolve-text">${paragrafoResolve}, ${dados.nacionalidade}, portadora do RG n.º ${dados.rg}, inscrita no CPF sob o n.º ${dados.cpf}, matrícula n.º ${dados.matricula}, ${dados.cargaHoraria}, ocupante do cargo de <b class="uppercase">${dados.cargo}</b>, lotada na <b class="uppercase">${dados.lotacao}</b>, com admissão no serviço público em ${dados.admissao}, ${dados.fundamentoLegal}, com início do benefício na data da publicação deste Ato de Aposentadoria, de acordo com o quadro discriminativo abaixo:</p><table class="proventos-table"><thead><tr><th>CÁLCULO DOS PROVENTOS</th><th>VALOR</th></tr></thead><tbody>${proventosHtmlTableRows}</tbody><tfoot><tr><td>TOTAL DOS PROVENTOS</td><td>${valorFormatado}</td></tr></tfoot></table><p class="justify">Desse modo, os proventos da servidora serão fixados em ${valorFormatado} (${totalPorExtenso} reais).</p><p class="center">Itapipoca – CE, ${dados.dataAtual}.</p><div class="signature-block"><p class="uppercase bold">FELIPE SOUZA PINHEIRO</p><p>Prefeito Municipal</p></div><div class="signature-block"><p class="uppercase bold">EDIANIA DE CASTRO ALBUQUERQUE</p><p>Presidente do ITAPREV</p></div></div></body></html>`;
        
        const novaAba = window.open();
        novaAba.document.open();
        novaAba.document.write(conteudoHtml);
        novaAba.document.close();
        showToast("Documento gerado em nova aba. Use a função de imprimir (Ctrl+P) para salvar como PDF.", true);
    } catch (e) {
        showToast("Ocorreu um erro ao gerar o documento.");
        console.error("Erro na geração do ato de aposentadoria:", e);
    } finally {
        toggleSpinner(btn, false);
    }
}

function gerarDocumentoCTC(btn) { toggleSpinner(btn, true); try { const totalDias = calcularTempoTotalCTC(); const { anos, meses, dias } = diasParaAnosMesesDias(totalDias); const tempoNumerico = `${anos} ${anos === 1 ? 'ano' : 'anos'}, ${meses} ${meses === 1 ? 'mês' : 'meses'} e ${dias} ${dias === 1 ? 'dia' : 'dias'}`; const anoExtenso = valorPorExtenso(String(anos)); const mesExtenso = valorPorExtenso(String(meses)); const diaExtenso = valorPorExtenso(String(dias)); const tempoPorExtenso = `${anoExtenso} ${anos === 1 ? 'ano' : 'anos'}, ${mesExtenso} ${meses === 1 ? 'mês' : 'meses'} e ${diaExtenso} ${dias === 1 ? 'dia' : 'dias'}`; const dados = { nomeServidor: document.getElementById('ctc-nomeServidor').value.toUpperCase() || '________________', matricula: document.getElementById('ctc-matricula').value || '________________', dataNascimento: formatarDataBR(document.getElementById('ctc-dataNascimento').value, true) || '__/__/____', sexo: document.getElementById('ctc-sexo').value === 'F' ? 'Feminino' : 'Masculino', cargo: document.getElementById('ctc-cargo').value || '________________', lotacao: document.getElementById('ctc-lotacao').value || '________________', admissao: formatarDataBR(document.getElementById('ctc-dataAdmissao').value, true) || '__/__/____', exoneracao: formatarDataBR(document.getElementById('ctc-dataExoneracao').value, true) || '__/__/____', processo: document.getElementById('ctc-processo').value || '________________', dataAtual: formatarDataPorExtenso(new Date().toISOString().split('T')[0]), }; let periodosHtmlTableRows = ''; document.querySelectorAll("#corpo-tabela-periodos-ctc tr").forEach(linha => { const inicio = formatarDataBR(linha.querySelector('.ctc-inicio').value, true); const fim = formatarDataBR(linha.querySelector('.ctc-fim').value, true); const bruto = linha.querySelector('.ctc-bruto').value; const deducoes = linha.querySelector('.ctc-deducoes').value; const liquido = linha.querySelector('.ctc-liquido').value; const fonte = linha.querySelector('.ctc-fonte').value; periodosHtmlTableRows += `<tr><td>${inicio}</td><td>${fim}</td><td>${bruto}</td><td>${deducoes}</td><td>${liquido}</td><td>${fonte}</td></tr>`; }); const estilo = ` <style> body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; margin: 20mm; color: #000; } .container { width: 100%; } .center { text-align: center; } .justify { text-align: justify; } .bold { font-weight: bold; } .uppercase { text-transform: uppercase; } .header { margin-bottom: 20px; line-height: 1.3; } .header p { margin: 0; } h3 { margin: 25px 0 15px 0; } table { width: 100%; border-collapse: collapse; margin: 15px 0; } th, td { border: 1px solid black; padding: 4px 6px; text-align: center; } th { background-color: #f2f2f2; } .info-table td { text-align: left; padding: 5px; } .info-table .label { font-weight: bold; width: 180px; } .declaracao { margin-top: 20px; font-size: 11pt; line-height: 1.4; } .assinatura { margin-top: 60px; text-align: center; } @media print { body { margin: 15mm; } } </style> `; const conteudoHtml = ` <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>CTC - ${dados.nomeServidor}</title>${estilo}</head><body> <div class="container"> <div class="center header"> <p class="bold uppercase">PREFEITURA MUNICIPAL DE ITAPIPOCA</p> <p class="bold uppercase">INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES MUNICIPAIS DE ITAPIPOCA – ITAPREV</p> <p>CNPJ: 10.198.831/0001-38</p> </div> <h3 class="center bold">CERTIDÃO DE TEMPO DE CONTRIBUIÇÃO</h3> <h3 class="center bold">Nº ${dados.processo}</h3> <table class="info-table"> <tr><td class="label">NOME DO SERVIDOR:</td><td colspan="3" class="uppercase bold">${dados.nomeServidor}</td></tr> <tr><td class="label">DATA DE NASCIMENTO:</td><td>${dados.dataNascimento}</td><td class="label">SEXO:</td><td>${dados.sexo}</td></tr> <tr><td class="label">MATRÍCULA:</td><td>${dados.matricula}</td><td class="label">ADMISSÃO:</td><td>${dados.admissao}</td></tr> <tr><td class="label">CARGO EFETIVO:</td><td class="uppercase">${dados.cargo}</td><td class="label">EXONERAÇÃO:</td><td>${dados.exoneracao}</td></tr> <tr><td class="label">LOTAÇÃO:</td><td colspan="3" class="uppercase">${dados.lotacao}</td></tr> </table> <p class="justify">Certifico, em face do solicitado no processo nº ${dados.processo}, e do que consta nos arquivos desta instituição, que o(a) servidor(a) acima qualificado(a) possui o seguinte tempo de contribuição para este Regime Próprio de Previdência Social:</p> <table> <thead><tr><th>DE</th><th>ATÉ</th><th>TEMPO BRUTO (DIAS)</th><th>DEDUÇÕES (DIAS)</th><th>TEMPO LÍQUIDO (DIAS)</th><th>FONTE</th></tr></thead> <tbody>${periodosHtmlTableRows}</tbody> <tfoot> <tr class="bold"> <td colspan="4">TEMPO LÍQUIDO TOTAL EM DIAS:</td> <td colspan="2">${totalDias}</td> </tr> </tfoot> </table> <p class="justify bold uppercase">Tempo Total de Contribuição: ${tempoNumerico} (${tempoPorExtenso}), totalizando ${totalDias} dias.</p> <div class="declaracao"> <p class="justify">Declaro, sob as penas da lei, que as informações constantes nesta Certidão são a expressão da verdade, extraídas da documentação e dos registros funcionais do(a) servidor(a), e que se destinam a fazer prova junto ao Instituto Nacional do Seguro Social - INSS, para fins de averbação e/ou concessão de benefícios previdenciários.</p> <p class="justify">A presente Certidão foi emitida de acordo com o disposto no art. 9º da Lei nº 9.717/98, e em conformidade com as normas da Portaria MPS nº 154/2008.</p> </div> <p class="center" style="margin-top: 40px;">Itapipoca-CE, ${dados.dataAtual}.</p> <div class="assinatura"> <p>_________________________________________</p> <p class="bold uppercase">NOME DO RESPONSÁVEL PELA EMISSÃO</p> <p>Cargo/Função</p> </div> </div> </body></html> `; const novaAba = window.open(); novaAba.document.open(); novaAba.document.write(conteudoHtml); novaAba.document.close(); showToast("CTC gerada em nova aba. Use a função de imprimir (Ctrl+P) para salvar como PDF.", true); } catch (e) { showToast("Ocorreu um erro ao gerar a CTC."); console.error("Erro na geração da CTC:", e); } finally { toggleSpinner(btn, false); } }


// --- FUNÇÕES COMPLEMENTARES ---
function calculateValorLiquido(proventoBruto) { if (proventoBruto <= 0) { document.getElementById('resultadoLiquido').innerHTML = ''; return; } const tetoRGPS = 7786.02; let contribuicaoRPPS = 0; if (proventoBruto > tetoRGPS) { contribuicaoRPPS = (proventoBruto - tetoRGPS) * 0.14;  } const baseCalculoIR = proventoBruto - contribuicaoRPPS; let impostoRenda = 0; if (baseCalculoIR > 2259.20) { if (baseCalculoIR <= 2826.65) impostoRenda = (baseCalculoIR * 0.075) - 169.44; else if (baseCalculoIR <= 3751.05) impostoRenda = (baseCalculoIR * 0.15) - 381.44; else if (baseCalculoIR <= 4664.68) impostoRenda = (baseCalculoIR * 0.225) - 662.77; else impostoRenda = (baseCalculoIR * 0.275) - 896.00; } impostoRenda = Math.max(0, impostoRenda); const totalDescontos = contribuicaoRPPS + impostoRenda, valorLiquido = proventoBruto - totalDescontos; const html = `<h3>Estimativa do Valor Líquido</h3><p>Abaixo uma simulação dos descontos legais sobre o valor bruto do benefício.</p><table><tr><td>Provento Bruto</td><td>${formatarDinheiro(proventoBruto)}</td></tr><tr><td>(-) Contribuição RPPS (Inativos)</td><td>${formatarDinheiro(contribuicaoRPPS)}</td></tr><tr><td>(-) Imposto de Renda (IRRF)</td><td>${formatarDinheiro(impostoRenda)}</td></tr><tr style="font-weight:bold;"><td>(=) Valor Líquido Estimado</td><td>${formatarDinheiro(valorLiquido)}</td></tr></table><small>Nota: Valores de descontos são estimativas baseadas em tabelas padrão e podem variar.</small>`; document.getElementById('resultadoLiquido').innerHTML = html; }
function projetarAposentadoria(mediaSalarial){ const resultadoProjecaoDiv = document.getElementById('resultadoProjecao'); const dataNascimento = new Date(document.getElementById('dataNascimento').value + 'T00:00:00'), dataAdmissao = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00'), sexo = document.getElementById('sexo').value, tempoExternoDias = parseInt(document.getElementById('tempoExterno').value) || 0, tempoEspecialDias = parseInt(document.getElementById('tempoEspecial').value) || 0, hoje = new Date(), dataReforma = new Date('2019-11-13T00:00:00'); const idadeAtual = (hoje - dataNascimento) / (1000 * 60 * 60 * 24 * 365.25), tempoServicoPublico = (hoje - dataAdmissao) / (1000 * 60 * 60 * 24 * 365.25), tempoContribuicaoTotal = tempoServicoPublico + (tempoExternoDias / 365.25) + (tempoEspecialDias / 365.25); const tempoContribuicaoNaReforma = ((dataReforma - dataAdmissao) / (1000 * 60 * 60 * 24 * 365.25)) + (tempoExternoDias / 365.25) + (tempoEspecialDias / 365.25); let projecoes = {}, regraAtingida = null; const valorRegraGeral = mediaSalarial * Math.min(1, 0.6 + (Math.max(0, Math.floor(tempoContribuicaoTotal) - 20) * 0.02)); const tempoMinPed50 = sexo === 'M' ? 33 : 28; if (tempoContribuicaoNaReforma >= tempoMinPed50) { const tempoNecessario = sexo === 'M' ? 35 : 30, tempoFaltante = Math.max(0, tempoNecessario - tempoContribuicaoNaReforma), pedagio = tempoFaltante * 0.5; if (tempoContribuicaoTotal >= tempoNecessario + pedagio) { const fatorPrev = calcularFatorPrevidenciario(idadeAtual, tempoContribuicaoTotal, sexo); projecoes['Pedágio 50%'] = { data: 'Já cumpriu!', valor: mediaSalarial * fatorPrev, obs: `Fator Previdenciário: ${fatorPrev.toFixed(4)}`, legal: "Art. 17 da EC 103/2019" }; if (!regraAtingida) regraAtingida = projecoes['Pedágio 50%'].legal; } else { projecoes['Pedágio 50%'] = { data: 'Não cumpriu', valor: 0, obs: 'Requer tempo de contribuição + pedágio' }; } } const idadeMinPed100 = sexo === 'M' ? 60 : 57, tempoNecPed100 = sexo === 'M' ? 35 : 30; if (idadeAtual >= idadeMinPed100 && tempoContribuicaoTotal >= tempoNecPed100) { projecoes['Pedágio 100%'] = { data: 'Já cumpriu!', valor: mediaSalarial, obs: '100% da média', legal: "Art. 20 da EC 103/2019" }; if (!regraAtingida) regraAtingida = projecoes['Pedágio 100%'].legal; } else { const anosParaIdade = Math.max(0, idadeMinPed100 - idadeAtual), anosParaTempo = Math.max(0, tempoNecPed100 - tempoContribuicaoTotal), anosFaltantes = Math.max(anosParaIdade, anosParaTempo); if (anosFaltantes < 40) { const dataProjetada = new Date(); dataProjetada.setFullYear(dataProjetada.getFullYear() + Math.ceil(anosFaltantes)); projecoes['Pedágio 100%'] = { data: `~ ${dataProjetada.toLocaleDateString('pt-BR')}`, valor: mediaSalarial, obs: '100% da média' }; } } const anoAtual = hoje.getFullYear(), idadeMinProgressiva = (sexo === 'M' ? 61 : 56) + Math.floor((anoAtual - 2019) * 0.5), tempoMinProgressiva = sexo === 'M' ? 35 : 30; if (idadeAtual >= idadeMinProgressiva && tempoContribuicaoTotal >= tempoMinProgressiva) { projecoes['Idade Progressiva'] = { data: 'Já cumpriu!', valor: valorRegraGeral, obs: '60% + 2% por ano acima de 20', legal: "Art. 4º da EC 103/2019 c/c Lei Municipal 047/2008" }; if (!regraAtingida) regraAtingida = projecoes['Idade Progressiva'].legal; } let pontosAtuais = idadeAtual + tempoContribuicaoTotal, pontosNecessarios = (sexo === 'M' ? 96 : 86) + (hoje.getFullYear() - 2019); if (pontosAtuais >= pontosNecessarios) { projecoes['Pontos'] = { data: 'Já cumpriu!', valor: valorRegraGeral, obs: '60% + 2% por ano acima de 20', legal: "Art. 4º da EC 103/2019 c/c Lei Municipal 047/2008" }; if (!regraAtingida) regraAtingida = projecoes['Pontos'].legal; } const R_IDADE_MIN_M = 65, R_IDADE_MIN_F = 62; if (idadeAtual >= (sexo === 'M' ? R_IDADE_MIN_M : R_IDADE_MIN_F) && tempoContribuicaoTotal >= 25) { projecoes['Regra Permanente'] = { data: 'Já cumpriu!', valor: valorRegraGeral, obs: '60% + 2% por ano acima de 20', legal: "Art. 10 da EC 103/2019 c/c Lei Municipal 047/2008" }; if (!regraAtingida) regraAtingida = projecoes['Regra Permanente'].legal; } else { const anosParaIdade = Math.max(0, (sexo === 'M' ? R_IDADE_MIN_M : R_IDADE_MIN_F) - idadeAtual); if (anosParaIdade < 40) { const dataProjetada = new Date(); dataProjetada.setFullYear(dataProjetada.getFullYear() + Math.ceil(anosParaIdade)); projecoes['Regra Permanente'] = { data: `~ ${dataProjetada.toLocaleDateString('pt-BR')}`, valor: valorRegraGeral, obs: 'Requer 25 anos de contribuição' }; } } simulacaoResultados.fundamentoLegal = regraAtingida; let html = `<h3>📅 Projeção de Elegibilidade para Aposentadoria</h3><p>Com base nos dados fornecidos (Idade: ${idadeAtual.toFixed(1)}, Tempo Contribuição Total: ${tempoContribuicaoTotal.toFixed(1)} anos), as projeções são:</p><table style="text-align:left;"><thead><tr><th>Regra de Transição</th><th>Data Provável</th><th>Valor Estimado</th><th>Observação</th></tr></thead><tbody>`; if (Object.keys(projecoes).length > 0) { for (const regra in projecoes) { html += `<tr><td>${regra}</td><td>${projecoes[regra].data}</td><td>${projecoes[regra].valor > 0 ? formatarDinheiro(projecoes[regra].valor) : '-'}</td><td>${projecoes[regra].obs || ''}</td></tr>`; } } else { html += `<tr><td colspan="4">Nenhuma regra de aposentadoria foi cumprida ou está próxima de ser alcançada com os dados atuais.</td></tr>`; } html += '</tbody></table><small>Nota: As projeções são estimativas e não substituem uma análise oficial do RPPS.</small>'; resultadoProjecaoDiv.innerHTML = html; }
function calcularFatorPrevidenciario(idade, tempoContribuicao, sexo) { const idadeInt = Math.floor(idade), expectativaSobrevida = EXPECTATIVA_SOBREVIDA_IBGE[sexo][idadeInt] || (sexo === 'M' ? 18.0 : 21.7), aliquota = 0.31; const fator = ((tempoContribuicao * aliquota) / expectativaSobrevida) * (1 + (idade + tempoContribuicao * aliquota) / 100); return fator < 0 ? 0 : fator; }
function verificarAbonoPermanencia(){ const resultadoAbonoDiv = document.getElementById('resultadoAbono'), dataNascimento = new Date(document.getElementById('dataNascimento').value + 'T00:00:00'), dataAdmissao = new Date(document.getElementById('dataAdmissao').value + 'T00:00:00'), sexo = document.getElementById('sexo').value, hoje = new Date(); const idade = (hoje - dataNascimento)/(1000*60*60*24*365.25), tempoContribuicao = (hoje - dataAdmissao)/(1000*60*60*24*365.25) + (parseInt(document.getElementById('tempoExterno').value)/365.25) + (parseInt(document.getElementById('tempoEspecial').value)/365.25); const idadeMin = sexo==='M'?62:57, tempoMin = sexo==='M'?35:30; if (idade >= idadeMin && tempoContribuicao >= tempoMin){ resultadoAbonoDiv.innerHTML = `<h3>✅ Abono de Permanência</h3><p>O servidor <b>cumpriu os requisitos</b> para aposentadoria voluntária e, ao optar por permanecer em atividade, tem direito ao Abono de Permanência, correspondente ao valor de sua contribuição previdenciária.</p>`; }else{ resultadoAbonoDiv.innerHTML = ''; } }
function desenharGrafico(salarios,media){ const ctx = document.getElementById("graficoSalarios").getContext("2d"); if (salarioChart) salarioChart.destroy(); const isDarkMode = document.body.classList.contains('dark-mode'), barColor = isDarkMode ? '#90caf9' : '#0d47a1', gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', fontColor = isDarkMode ? '#eee' : '#333'; salarioChart = new Chart(ctx,{ type:"bar", data:{ labels:salarios.map(i=>i.label), datasets:[{label:"Salário Atualizado (R$)",data:salarios.map(i=>i.value.toFixed(2)),backgroundColor:barColor}] }, options:{ responsive:true, plugins:{ title:{display:true,text:'Evolução dos Salários Atualizados',color:fontColor,font:{size:16}}, annotation:{ annotations:{ line1:{ type:'line',yMin:media,yMax:media,borderColor:'red',borderWidth:2,borderDash:[6,6], label:{content:`Média: ${formatarDinheiro(media)}`,enabled:true,position:'end',backgroundColor:'rgba(255,0,0,0.7)'} } } } }, scales:{ y:{beginAtZero:true,ticks:{color:fontColor},grid:{color:gridColor}}, x:{ticks:{color:fontColor},grid:{color:gridColor}} } } }); }
function exportarExcel(btn){ toggleSpinner(btn, true); setTimeout(() => { try { const ws_data = [ ["Informações do Servidor"], ["Nome", document.getElementById("nomeServidor").value], ["Matrícula", document.getElementById("matriculaServidor").value], ["CPF", document.getElementById("cpfServidor").value], ["Data do Cálculo", document.getElementById("dataCalculo").value], [], ["Resumo da Simulação"], ["Tipo de Benefício", simulacaoResultados.tipo||""], ["Valor da Média Salarial (R$)", simulacaoResultados.mediaSalarial?simulacaoResultados.mediaSalarial.toFixed(2):"N/A"], ["Valor Final do Benefício (R$)", simulacaoResultados.valorBeneficioFinal?simulacaoResultados.valorBeneficioFinal.toFixed(2):"N/A"], [], ['Tabela de Salários de Contribuição'], ['Nº','MÊS/ANO','FATOR','SALÁRIO','SALÁRIO ATUALIZADO'] ]; document.querySelectorAll("#corpo-tabela tr").forEach((linha,index)=>{ const inputs = linha.querySelectorAll("input"); ws_data.push([index+1,inputs[0].value,inputs[1].value,inputs[2].value,inputs[3].value]); }); const ws = XLSX.utils.aoa_to_sheet(ws_data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Simulação"); XLSX.writeFile(wb, "simulacao-previdencia.xlsx"); showToast("Exportado para Excel com sucesso!", true); } catch (e) { showToast("Erro ao exportar para Excel."); console.error(e); } finally { toggleSpinner(btn, false); } }, 50); }
function importarExcel() { const file = document.getElementById('arquivoExcel').files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const data = new Uint8Array(e.target.result), workbook = XLSX.read(data, { type: "array" }), sheet = workbook.Sheets[workbook.SheetNames[0]], rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }); limparTabela(); let startIndex = rows.findIndex(row => row.some(cell => /(mês\/ano|mes\/ano)/i.test(String(cell)))) + 1; if (startIndex === 0) startIndex = 1; for (let i = startIndex; i < rows.length; i++) { let [mesAno, fator, salario] = rows[i]; if (!mesAno && !fator && !salario) continue; if (typeof mesAno === "number" && mesAno > 1) { const date = XLSX.SSF.parse_date_code(mesAno); if (date) mesAno = String(date.m).padStart(2, "0") + "/" + date.y; } else { mesAno = String(mesAno); } const fatorNum = parseFloat(String(fator).replace(",", ".")), salarioNum = parseFloat(String(salario).replace(",", ".")); if (mesAno && !isNaN(fatorNum) && !isNaN(salarioNum)) { adicionarLinha(mesAno, fatorNum, salarioNum); } } showToast("Planilha importada com sucesso!", true); } catch (err) { showToast("Erro ao processar o arquivo Excel."); console.error(err); } finally { document.getElementById('arquivoExcel').value = ''; } }; reader.readAsArrayBuffer(file); }
function getPrintableHTML(){ const nome = document.getElementById("nomeServidor").value || "Servidor", isVoluntaria = document.getElementById('tipoBeneficio').value === 'voluntaria'; return `<style>body{font-family:Arial,sans-serif;font-size:10px;color:#333;}h2,h3{color:#0d47a1;border-bottom:1px solid #ccc;padding-bottom:4px;}table{border-collapse:collapse;width:100%;margin-top:10px;font-size:9px;}th,td{border:1px solid #ccc;padding:5px;text-align:left;}th{background-color:#f2f2f2;}.header{text-align:center;margin-bottom:20px;}.header h1{margin:0;color:#0d47a1;}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 15px;}.info-grid p{margin:0;}</style><div class="header"><h1>Relatório de Planejamento Previdenciário</h1><p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p></div><h2>Dados do Servidor</h2><div class="info-grid"><p><strong>Nome:</strong> ${nome}</p><p><strong>Matrícula:</strong> ${document.getElementById("matriculaServidor").value}</p><p><strong>CPF:</strong> ${document.getElementById("cpfServidor").value}</p><p><strong>Cargo:</strong> ${document.getElementById("cargoServidor").value}</p><p><strong>Admissão:</strong> ${formatarDataBR(document.getElementById('dataAdmissao').value)}</p><p><strong>Nascimento:</strong> ${formatarDataBR(document.getElementById('dataNascimento').value)}</p></div>${document.getElementById("resultado").innerHTML}${document.getElementById("resultadoLiquido").innerHTML}${isVoluntaria ? document.getElementById("resultadoProjecao").innerHTML : ''}${isVoluntaria ? document.getElementById("resultadoAbono").innerHTML : ''}`; }
function imprimirSimulacao(){ document.getElementById("printableArea").innerHTML = getPrintableHTML(); window.print(); }


// --- HISTÓRICO E ARMAZENAMENTO ---
function chaveHistorico(){ return "historicoSimulacoes_" + usuarioAtual; }
function salvarSimulacaoHistorico(nomeFornecido){ let nome = (typeof nomeFornecido === "string") ? nomeFornecido : document.getElementById("nomeSimulacao").value.trim(); if (!nome){ return showToast("Digite um nome para a simulação."); } const dados = coletarDadosSimulacao(), chave = chaveHistorico(), historico = JSON.parse(localStorage.getItem(chave) || "[]"); historico.unshift({nome,dados,data:new Date().toISOString()}); localStorage.setItem(chave, JSON.stringify(historico)); showToast("💾 Simulação salva no histórico!", true); listarHistorico(); }
function coletarDadosSimulacao(){ const dados = { passo1: {}, tabela:[], proventosAto: [], dependentes: [], resultados:simulacaoResultados }; document.querySelectorAll('#passo1 input, #passo1 select, #passo1 textarea').forEach(el => { if(el.id) dados.passo1[el.id] = el.value; }); document.querySelectorAll("#corpo-tabela tr").forEach(linha=>{ const inputs = linha.querySelectorAll("input"); dados.tabela.push([inputs[0].value,inputs[1].value,inputs[2].value]); }); document.querySelectorAll("#corpo-tabela-proventos-ato tr").forEach(linha=>{ const desc = linha.querySelector(".provento-descricao").value; const val = linha.querySelector(".provento-valor").value; dados.proventosAto.push({descricao: desc, valor: val}); }); document.querySelectorAll("#corpo-tabela-dependentes tr").forEach(linha=>{ dados.dependentes.push({ nome: linha.querySelector('.dependente-nome').value, dataNasc: linha.querySelector('.dependente-dataNasc').value, parentesco: linha.querySelector('.dependente-parentesco').value, invalido: linha.querySelector('.dependente-invalido').value }); }); return dados; }
function listarHistorico(){ const lista = document.getElementById("listaHistorico"); if(!lista) return; lista.innerHTML=""; const chave = chaveHistorico(), historico = JSON.parse(localStorage.getItem(chave) || "[]"); if (historico.length===0){ lista.innerHTML="<li>Nenhuma simulação salva ainda.</li>"; return; } historico.forEach((registro,index)=>{ const item = document.createElement("li"); const dataFmt = new Date(registro.data||Date.now()).toLocaleString('pt-BR'); item.innerHTML= `<div class="item-info"><span>${registro.nome}</span><small>${dataFmt}</small></div><div class="item-actions"><button onclick="carregarDoHistorico(${index})" title="Carregar Simulação"><i class="ri-folder-open-line"></i></button><button class="danger" onclick="excluirDoHistorico(${index})" title="Excluir Simulação"><i class="ri-delete-bin-line"></i></button></div>`; lista.appendChild(item); }); }
function carregarDoHistorico(index){ const chave = chaveHistorico(), historico = JSON.parse(localStorage.getItem(chave) || "[]"), registro = historico[index]; if(!registro) return; const dados = registro.dados; handleNavClick(null, 'simulacao'); setTimeout(() => { for(const key in dados.passo1){ const el = document.getElementById(key); if(el) el.value = dados.passo1[key]; } if(dados.tabela) dados.tabela.forEach(linha => adicionarLinha(...linha)); if(dados.proventosAto) { document.getElementById('corpo-tabela-proventos-ato').innerHTML = ''; dados.proventosAto.forEach(p => adicionarLinhaProvento(p.descricao, p.valor)); calculateTotalProventos(); } if(dados.dependentes) { document.getElementById('corpo-tabela-dependentes').innerHTML = ''; dados.dependentes.forEach(d => adicionarLinhaDependente(d.nome, d.dataNasc, d.parentesco, d.invalido)); } simulacaoResultados = dados.resultados || {}; alternarCamposBeneficio(); showToast(`Simulação "${registro.nome}" carregada.`, true); const tipo = document.getElementById('tipoBeneficio').value; if (tipo !== 'pensao_aposentado') { irParaPasso(2); } else { irParaPasso(1); } calcularBeneficio(true); }, 100); }
function excluirDoHistorico(index){ const chave = chaveHistorico(); let historico = JSON.parse(localStorage.getItem(chave) || "[]"); if(!historico[index]) return; if(confirm(`Deseja realmente excluir a simulação "${historico[index].nome}"?`)){ historico.splice(index,1); localStorage.setItem(chave, JSON.stringify(historico)); listarHistorico(); showToast("Simulação excluída do histórico.", true); } }
function exportarTudoZIP(btn){ toggleSpinner(btn, true); setTimeout(() => { try { const zip = new JSZip(), dados = coletarDadosSimulacao(), nomeBase = (dados.passo1.nomeServidor || "simulacao").replace(/\s+/g,'_'); zip.file(`${nomeBase}.json`, JSON.stringify(dados,null,2)); let csv = "MES_ANO;FATOR;SALARIO\n"; dados.tabela.forEach(l=>{csv += `${l[0]};${l[1]};${l[2]}\n`;}); zip.file(`${nomeBase}-salarios.csv`, csv); zip.file(`${nomeBase}-relatorio.html`, getPrintableHTML()); zip.generateAsync({type:"blob"}).then(content=>{ const a = document.createElement("a"); a.href = URL.createObjectURL(content); a.download = `${nomeBase}-pack.zip`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href); showToast("Arquivo ZIP exportado!", true); }); } catch (e) { showToast("Erro ao exportar o arquivo ZIP."); console.error(e); } finally { toggleSpinner(btn, false); } }, 50); }