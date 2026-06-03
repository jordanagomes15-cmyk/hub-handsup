(function () {
  const KEY = "hands_up_hub_v2";
  const ADMIN_EMAIL = "jordanagomes15@gmail.com";
  const ADMIN_PASSWORD = "admjo123";
  const statuses = ["Nao iniciado", "Trabalhando", "Aprovacao", "Concluido"];
  const priorities = ["Urgente", "Alta", "Media", "Baixa"];
  const uid = () => Math.random().toString(36).slice(2, 10);
  const today = () => new Date().toISOString().slice(0, 10);
  const initials = (name = "?") => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0] || "").join("").toUpperCase() || "?";
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

  const seed = {
    currentUserId: "u_admin",
    view: "home",
    tab: "table",
    activeGroupId: "g_on",
    activeBoardId: "b_samba",
    workspace: {
      name: "HANDS UP MARKETING",
      description: "Hub operacional para quadros, demandas, responsaveis, comentarios, notificacoes e calendario.",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1600&auto=format&fit=crop"
    },
    users: [
      { id: "u_admin", name: "Jordana Gomes", username: "Jordana Gomes", email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: "Admin", status: "approved", avatar: "" }
    ],
    groups: [
      {
        id: "g_on",
        name: "HANDS MIDIA ON",
        boards: [
          {
            id: "b_samba",
            name: "SAMBA DO MAR",
            cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1600&auto=format&fit=crop",
            columns: ["Elemento", "Pessoa", "Data", "Status", "Prioridade", "Canal", "Comentario"],
            sections: [
              {
                id: "s_base",
                name: "BASE",
                collapsed: false,
                tasks: [
                  { id: "t1", title: "TRINCA DE FOTOS", assignees: ["u_admin"], due: "2026-06-05", status: "Trabalhando", priority: "Alta", channel: "Instagram", comment: "" },
                  { id: "t2", title: "STORIES | Flyer proxima edicao", assignees: [], due: "2026-06-08", status: "Nao iniciado", priority: "Media", channel: "Stories", comment: "" }
                ]
              }
            ]
          }
        ]
      },
      {
        id: "g_off",
        name: "HANDS MIDIA OFF",
        boards: [
          { id: "b_demandas", name: "Demandas | HANDS UP", cover: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop", columns: ["Elemento", "Pessoa", "Data", "Status", "Prioridade", "Canal", "Comentario"], sections: [{ id: "s_off", name: "BASE", collapsed: false, tasks: [] }] }
        ]
      }
    ],
    notifications: []
  };

  let state = load();
  let modal = null;
  let loginMode = "login";
  let filters = { search: "", status: "Todos", priority: "Todas" };

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY));
      return parsed?.users && parsed?.groups ? parsed : structuredClone(seed);
    } catch {
      return structuredClone(seed);
    }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
  function user() { return state.users.find((u) => u.id === state.currentUserId) || null; }
  function isAdmin() { return user()?.role === "Admin"; }
  function approved() { return state.users.filter((u) => u.status === "approved"); }
  function pending() { return state.users.filter((u) => u.status === "pending"); }
  function group() { return state.groups.find((g) => g.id === state.activeGroupId) || state.groups[0]; }
  function board() { const g = group(); return g?.boards.find((b) => b.id === state.activeBoardId) || g?.boards[0]; }
  function allBoards() { return state.groups.flatMap((g) => g.boards.map((b) => ({ ...b, groupId: g.id, groupName: g.name }))); }
  function allTasks() {
    return state.groups.flatMap((g) => g.boards.flatMap((b) => b.sections.flatMap((s) => s.tasks.map((t) => ({ ...t, groupId: g.id, boardId: b.id, boardName: b.name, sectionId: s.id, sectionName: s.name })))))
  }
  function findTask(id) {
    for (const g of state.groups) for (const b of g.boards) for (const s of b.sections) {
      const t = s.tasks.find((task) => task.id === id);
      if (t) return { group: g, board: b, section: s, task: t };
    }
    return null;
  }
  function notify(userId, task, kind, message) {
    if (!userId) return;
    state.notifications.unshift({ id: uid(), userId, taskId: task?.id || "", kind, title: task?.title || "Hub", message, read: false, createdAt: new Date().toISOString() });
  }
  function mentionedIds(text) {
    const lower = String(text || "").toLowerCase();
    return approved().filter((u) => lower.includes(`@${u.name}`.toLowerCase()) || lower.includes(`@${u.username}`.toLowerCase())).map((u) => u.id);
  }
  function avatar(u) { return `<span class="avatar" title="${esc(u?.name || "")}">${initials(u?.name)}</span>`; }
  function statusClass(v) { return v === "Trabalhando" ? "work" : v === "Aprovacao" ? "review" : v === "Concluido" ? "done" : "todo"; }
  function priorityClass(v) { return v === "Urgente" || v === "Alta" ? "urgent" : v === "Media" ? "medium" : "todo"; }
  function visible(t) {
    const hay = [t.title, t.status, t.priority, t.channel, t.comment].join(" ").toLowerCase();
    return (!filters.search || hay.includes(filters.search.toLowerCase())) && (filters.status === "Todos" || t.status === filters.status) && (filters.priority === "Todas" || t.priority === filters.priority);
  }

  function setTask(id, key, value) {
    const found = findTask(id);
    if (!found) return;
    const before = [...(found.task.assignees || [])];
    found.task[key] = value;
    if (key === "assignees") value.filter((x) => !before.includes(x)).forEach((x) => notify(x, found.task, "assigned", `Voce foi relacionado a demanda ${found.task.title}.`));
    if (key === "comment") mentionedIds(value).forEach((x) => notify(x, found.task, "mention", "Voce foi mencionado em um comentario."));
    save();
    render();
  }
  function addTask(sectionId, date = today()) {
    const b = board();
    const s = b.sections.find((x) => x.id === sectionId) || b.sections[0];
    const task = { id: uid(), title: "Nova demanda", assignees: [], due: date, status: "Nao iniciado", priority: "Media", channel: "", comment: "" };
    s.tasks.push(task);
    modal = { type: "task", taskId: task.id };
    save();
    render();
  }
  function deleteTask(id) {
    const found = findTask(id);
    if (!found) return;
    found.section.tasks = found.section.tasks.filter((t) => t.id !== id);
    save();
    render();
  }
  function moveTask(id, dir) {
    const found = findTask(id);
    if (!found) return;
    const list = found.section.tasks;
    const i = list.findIndex((t) => t.id === id);
    const n = i + dir;
    if (n < 0 || n >= list.length) return;
    [list[i], list[n]] = [list[n], list[i]];
    save();
    render();
  }
  function createGroup() {
    const g = { id: uid(), name: "NOVO GRUPO", boards: [] };
    state.groups.push(g);
    state.activeGroupId = g.id;
    save();
    render();
  }
  function createBoard(groupId) {
    const g = state.groups.find((x) => x.id === groupId);
    const b = { id: uid(), name: "Novo quadro", cover: state.workspace.cover, columns: ["Elemento", "Pessoa", "Data", "Status", "Prioridade", "Canal", "Comentario"], sections: [{ id: uid(), name: "BASE", collapsed: false, tasks: [] }] };
    g.boards.push(b);
    state.activeGroupId = g.id;
    state.activeBoardId = b.id;
    state.view = "board";
    state.tab = "table";
    save();
    render();
  }
  function signup(data) {
    if (state.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) return "Esse email ja existe.";
    const u = { id: uid(), ...data, role: "Convidado", status: "pending", avatar: "" };
    state.users.push(u);
    notify(state.users.find((x) => x.role === "Admin")?.id, null, "signup", `${u.name} pediu acesso ao Hub.`);
    loginMode = "login";
    save();
    render();
    return "";
  }
  function approveUser(id, role) {
    const u = state.users.find((x) => x.id === id);
    if (!u) return;
    u.status = "approved";
    u.role = role;
    notify(u.id, null, "approved", "Seu acesso ao Hub foi aprovado.");
    save();
    render();
  }

  function loginScreen() {
    const reg = loginMode === "signup";
    return `<main class="login"><section class="login-box"><div class="brand"><div class="mark">HU</div><div><strong>HANDS UP Hub</strong><div class="muted">Acesso e cadastro</div></div></div><form id="${reg ? "signupForm" : "loginForm"}">${reg ? `<label class="field">Nome<input name="name" required></label><label class="field">Nome de usuario<input name="username" required></label>` : ""}<label class="field">Email<input name="email" type="email" required value="${reg ? "" : ADMIN_EMAIL}"></label><label class="field">Senha<input name="password" type="password" required value="${reg ? "" : ADMIN_PASSWORD}"></label><button class="primary">${reg ? "Pedir acesso" : "Entrar"}</button></form><div class="switcher"><button class="${reg ? "" : "active"}" data-login-mode="login">Entrar</button><button class="${reg ? "active" : ""}" data-login-mode="signup">Cadastrar</button></div><p class="muted">Admin inicial: ${ADMIN_EMAIL}</p></section></main>`;
  }
  function sidebar() {
    return `<aside class="sidebar"><div class="side-top"><div class="side-title">Area de trabalho</div>${isAdmin() ? `<button class="icon-btn" data-create-group>+</button>` : ""}</div><button class="nav-btn ${state.view === "home" ? "active" : ""}" data-view="home">Pagina inicial</button><button class="nav-btn ${state.view === "mywork" ? "active" : ""}" data-view="mywork">Meu trabalho</button>${state.groups.map((g) => `<div class="group"><div class="group-title"><button class="name-button" data-rename-group="${g.id}">${esc(g.name)}</button>${isAdmin() ? `<button class="icon-btn" data-create-board="${g.id}">+</button>` : ""}</div>${g.boards.map((b) => `<button class="board-btn ${state.view === "board" && state.activeBoardId === b.id ? "active" : ""}" data-open-board="${g.id}:${b.id}"><span>${initials(b.name)}</span><span>${esc(b.name)}</span></button>`).join("")}</div>`).join("")}</aside>`;
  }
  function topbar() {
    const unread = state.notifications.filter((n) => !n.read && (n.userId === state.currentUserId || isAdmin())).length;
    return `<header class="topbar"><strong>${esc(state.workspace.name)}</strong><div class="top-actions"><span class="muted">Usuarios: ${approved().length}</span><button class="icon-btn" data-modal="notifications">N${unread ? `<span class="badge">${unread}</span>` : ""}</button>${isAdmin() ? `<button class="icon-btn" data-modal="admin">A</button>` : ""}<button class="icon-btn" data-modal="account">${initials(user()?.name)}</button></div></header>`;
  }
  function home() {
    const boards = allBoards();
    return `<section class="hero"><div><h1>${esc(state.workspace.name)}</h1><p>${esc(state.workspace.description)}</p></div>${isAdmin() ? `<button class="ghost" data-modal="workspace">Editar</button>` : ""}</section><section class="stats"><div class="stat"><span>Grupos</span><strong>${state.groups.length}</strong></div><div class="stat"><span>Quadros</span><strong>${boards.length}</strong></div><div class="stat"><span>Demandas</span><strong>${allTasks().length}</strong></div><div class="stat"><span>Usuarios</span><strong>${approved().length}</strong></div></section><section class="panel"><div class="panel-pad"><h2>Quadros</h2></div><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Grupo</th><th>Demandas</th><th></th></tr></thead><tbody>${boards.map((b) => `<tr><td><strong>${esc(b.name)}</strong></td><td>${esc(b.groupName)}</td><td>${b.sections.reduce((sum, s) => sum + s.tasks.length, 0)}</td><td><button class="small-btn" data-open-board="${b.groupId}:${b.id}">Abrir</button></td></tr>`).join("")}</tbody></table></div></section>`;
  }
  function boardView() {
    const b = board();
    if (!b) return `<section class="panel panel-pad">Crie um quadro para comecar.</section>`;
    return `<section class="board-head" style="background-image:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.2)),url('${esc(b.cover || state.workspace.cover)}')"><div><small>${esc(group().name)} / Quadro</small><h1>${esc(b.name)}</h1></div>${isAdmin() ? `<button class="ghost" data-modal="board">Configurar</button>` : ""}</section><nav class="tabs">${["table:Tabela", "kanban:Kanban", "calendar:Calendario", "dashboard:Dashboard"].map((x) => { const [k, v] = x.split(":"); return `<button class="${state.tab === k ? "active" : ""}" data-tab="${k}">${v}</button>`; }).join("")}</nav><div class="toolbar"><input data-filter="search" placeholder="Pesquisar no quadro" value="${esc(filters.search)}"><select data-filter="status"><option>Todos</option>${statuses.map((s) => `<option ${filters.status === s ? "selected" : ""}>${s}</option>`).join("")}</select><select data-filter="priority"><option>Todas</option>${priorities.map((p) => `<option ${filters.priority === p ? "selected" : ""}>${p}</option>`).join("")}</select><button class="primary" data-add-task="${b.sections[0]?.id}">+ Criar elemento</button>${isAdmin() ? `<button class="ghost" data-add-section>+ Grupo</button><button class="ghost" data-modal="column">+ Coluna</button>` : ""}</div>${state.tab === "table" ? table(b) : state.tab === "kanban" ? kanban(b) : state.tab === "calendar" ? calendar(b) : dashboard(b)}`;
  }
  function table(b) {
    return `<section class="panel table-wrap"><table><thead><tr><th><input type="checkbox" data-select-all></th>${b.columns.map((c, i) => `<th><button class="name-button" data-rename-column="${i}">${esc(c)}</button></th>`).join("")}<th>Acoes</th></tr></thead><tbody>${b.sections.map((s) => `<tr class="section-row"><td><button class="name-button" data-toggle-section="${s.id}">${s.collapsed ? ">" : "v"}</button></td><td colspan="${b.columns.length + 1}"><button class="name-button" data-rename-section="${s.id}">${esc(s.name)}</button></td></tr>${s.collapsed ? "" : s.tasks.filter(visible).map(row).join("")}${s.collapsed ? "" : `<tr><td></td><td colspan="${b.columns.length + 1}"><button class="name-button" data-add-task="${s.id}">+ Adicionar elemento</button></td></tr>`}`).join("")}</tbody></table></section>`;
  }
  function row(t) {
    const people = (t.assignees || []).map((id) => state.users.find((u) => u.id === id)).filter(Boolean);
    return `<tr><td><input type="checkbox" class="row-check"></td><td><input class="cell-input" data-task-field="${t.id}:title" value="${esc(t.title)}"></td><td><button class="people" data-people="${t.id}">${people.length ? people.map(avatar).join("") : `<span class="avatar empty">+</span>`}</button></td><td><input class="cell-input" type="date" data-task-field="${t.id}:due" value="${esc(t.due || "")}"></td><td><button class="pill ${statusClass(t.status)}" data-pick="${t.id}:status">${esc(t.status)}</button></td><td><button class="pill ${priorityClass(t.priority)}" data-pick="${t.id}:priority">${esc(t.priority)}</button></td><td><input class="cell-input" data-task-field="${t.id}:channel" value="${esc(t.channel || "")}"></td><td><button class="small-btn" data-comment="${t.id}">${t.comment ? "Comentado" : "Comentar"}</button></td><td class="row-actions"><button class="small-btn" data-move="${t.id}:-1">Subir</button><button class="small-btn" data-move="${t.id}:1">Descer</button><button class="danger" data-delete="${t.id}">Excluir</button></td></tr>`;
  }
  function kanban(b) {
    const tasks = b.sections.flatMap((s) => s.tasks).filter(visible);
    return `<section class="kanban">${statuses.map((status) => `<div class="lane"><h3><button class="name-button" data-rename-status="${status}">${status}</button><span>${tasks.filter((t) => t.status === status).length}</span></h3>${tasks.filter((t) => t.status === status).map((t) => `<button class="task-card" data-task="${t.id}"><strong>${esc(t.title)}</strong><span class="muted">${esc(t.due || "Sem data")}</span><span class="pill ${priorityClass(t.priority)}">${esc(t.priority)}</span></button>`).join("")}</div>`).join("")}</section>`;
  }
  function calendar(b) {
    const now = new Date();
    const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const blanks = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const cells = Array.from({ length: blanks }, () => `<div class="day"></div>`);
    for (let d = 1; d <= total; d++) {
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const tasks = b.sections.flatMap((s) => s.tasks).filter((t) => t.due === date);
      cells.push(`<div class="day"><strong>${d}</strong><button data-add-date="${b.sections[0]?.id}:${date}">+ demanda</button>${tasks.map((t) => `<button data-task="${t.id}">${esc(t.title)}</button>`).join("")}</div>`);
    }
    return `<section class="calendar">${cells.join("")}</section>`;
  }
  function dashboard(b) {
    const tasks = b.sections.flatMap((s) => s.tasks);
    return `<section class="stats"><div class="stat"><span>Total</span><strong>${tasks.length}</strong></div><div class="stat"><span>Concluidas</span><strong>${tasks.filter((t) => t.status === "Concluido").length}</strong></div><div class="stat"><span>Alta prioridade</span><strong>${tasks.filter((t) => t.priority === "Alta" || t.priority === "Urgente").length}</strong></div><div class="stat"><span>Comentarios</span><strong>${tasks.filter((t) => t.comment).length}</strong></div></section>`;
  }
  function myWork() {
    const u = user();
    const tasks = allTasks().filter((t) => (t.assignees || []).includes(u.id) || mentionedIds(t.comment).includes(u.id)).sort((a, b) => String(a.due || "9999").localeCompare(String(b.due || "9999")));
    return `<section class="panel"><div class="panel-pad"><h1>Meu trabalho</h1><p class="muted">Demandas onde voce foi relacionado ou mencionado.</p></div><div class="table-wrap"><table><thead><tr><th>Demanda</th><th>Quadro</th><th>Data</th><th>Prioridade</th><th></th></tr></thead><tbody>${tasks.map((t) => `<tr><td>${esc(t.title)}</td><td>${esc(t.boardName)}</td><td>${esc(t.due || "")}</td><td>${esc(t.priority)}</td><td><button class="small-btn" data-task="${t.id}">Abrir</button></td></tr>`).join("")}</tbody></table></div></section>`;
  }
  function shell(title, body) { return `<div class="modal-backdrop"><section class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close>x</button></div>${body}</section></div>`; }
  function modalHtml() {
    if (!modal) return "";
    if (modal.type === "notifications") {
      const list = state.notifications.filter((n) => n.userId === state.currentUserId || isAdmin());
      return shell("Notificacoes", list.map((n) => `<button class="notice-row" data-open-notice="${n.id}"><span><strong>${esc(n.title)}</strong><br><span class="muted">${esc(n.message)}</span></span><span>${n.read ? "lida" : "nova"}</span></button>`).join("") || `<p class="muted">Sem notificacoes.</p>`);
    }
    if (modal.type === "admin") return shell("Admin", `<h3>Cadastros pendentes</h3>${pending().map((u) => `<div class="notice-row"><span>${avatar(u)} ${esc(u.name)}<br><span class="muted">${esc(u.email)}</span></span><span><button class="small-btn" data-approve="${u.id}:Editor">Editor</button> <button class="small-btn" data-approve="${u.id}:Convidado">Convidado</button> <button class="danger" data-remove-user="${u.id}">Excluir</button></span></div>`).join("") || `<p class="muted">Nenhum cadastro pendente.</p>`}<h3>Usuarios</h3>${approved().map((u) => `<div class="notice-row"><span>${avatar(u)} ${esc(u.name)}<br><span class="muted">${esc(u.role)}</span></span>${u.role !== "Admin" ? `<button class="danger" data-remove-user="${u.id}">Excluir</button>` : ""}</div>`).join("")}`);
    if (modal.type === "account") { const u = user(); return shell("Conta, acesso e layout", `<form id="accountForm"><label class="field">Nome<input name="name" value="${esc(u.name)}"></label><label class="field">Usuario<input name="username" value="${esc(u.username)}"></label><label class="field">Email<input name="email" value="${esc(u.email)}"></label><label class="field">Nova senha<input name="password" placeholder="Deixe em branco para manter"></label><button class="primary">Salvar</button><button class="ghost" type="button" data-logout>Sair</button></form>`); }
    if (modal.type === "workspace") return shell("Pagina inicial", `<form id="workspaceForm"><label class="field">Nome<input name="name" value="${esc(state.workspace.name)}"></label><label class="field">Descricao<textarea name="description">${esc(state.workspace.description)}</textarea></label><label class="field">Imagem de capa<input name="cover" value="${esc(state.workspace.cover)}"></label><button class="primary">Salvar</button></form>`);
    if (modal.type === "board") { const b = board(); return shell("Quadro", `<form id="boardForm"><label class="field">Nome<input name="name" value="${esc(b.name)}"></label><label class="field">Imagem de capa<input name="cover" value="${esc(b.cover || "")}"></label><button class="primary">Salvar</button></form>`); }
    if (modal.type === "column") return shell("Adicionar coluna", `<form id="columnForm"><label class="field">Tipo<select name="type"><option>Data</option><option>Texto curto</option><option>Texto longo</option><option>Status</option><option>Pessoa</option><option>Prioridade</option><option>Link</option><option>Barra de progresso</option><option>Deadline</option><option>Comentario</option></select></label><label class="field">Nome da coluna<input name="name" placeholder="Ex: Status de aprovacao"></label><button class="primary">Adicionar coluna</button></form>`);
    if (modal.type === "people") { const f = findTask(modal.taskId); return shell("Responsaveis", approved().map((u) => `<label class="notice-row"><span>${avatar(u)} ${esc(u.name)}</span><input type="checkbox" data-person="${u.id}" ${f.task.assignees.includes(u.id) ? "checked" : ""}></label>`).join("")); }
    if (modal.type === "comment") { const f = findTask(modal.taskId); return shell("Comentario", `<textarea id="commentText" class="cell-input" rows="7">${esc(f.task.comment || "")}</textarea><div class="tabs">${approved().map((u) => `<button data-mention="${u.id}">@${esc(u.name)}</button>`).join("")}</div><button class="primary" data-save-comment="${f.task.id}">Salvar</button>`); }
    if (modal.type === "pick") return shell(modal.field === "status" ? "Status" : "Prioridade", modal.options.map((o) => `<button class="notice-row" data-pick-value="${o}">${esc(o)}</button>`).join(""));
    if (modal.type === "task") { const f = findTask(modal.taskId); return shell("Demanda", `<form id="taskForm"><label class="field">Elemento<input name="title" value="${esc(f.task.title)}"></label><div class="grid-2"><label class="field">Data<input type="date" name="due" value="${esc(f.task.due || "")}"></label><label class="field">Canal<input name="channel" value="${esc(f.task.channel || "")}"></label></div><label class="field">Comentario<textarea name="comment">${esc(f.task.comment || "")}</textarea></label><button class="primary">Salvar</button></form>`); }
    return "";
  }

  function render() {
    const root = document.querySelector("#app");
    if (!user()) {
      root.innerHTML = loginScreen();
      bind();
      return;
    }
    root.innerHTML = `<div class="app">${sidebar()}<main class="main">${topbar()}${state.view === "home" ? home() : ""}${state.view === "board" ? boardView() : ""}${state.view === "mywork" ? myWork() : ""}</main></div>${modalHtml()}`;
    bind();
  }
  function bind() {
    document.querySelectorAll("[data-login-mode]").forEach((b) => b.onclick = () => { loginMode = b.dataset.loginMode; render(); });
    document.querySelector("#loginForm")?.addEventListener("submit", (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); const u = state.users.find((x) => x.email.toLowerCase() === d.email.toLowerCase() && x.password === d.password); if (!u) return alert("Login ou senha incorretos."); if (u.status !== "approved") return alert("Cadastro ainda nao liberado pelo admin."); state.currentUserId = u.id; save(); render(); });
    document.querySelector("#signupForm")?.addEventListener("submit", (e) => { e.preventDefault(); const error = signup(Object.fromEntries(new FormData(e.currentTarget))); alert(error || "Cadastro enviado para aprovacao."); });
    document.querySelectorAll("[data-view]").forEach((b) => b.onclick = () => { state.view = b.dataset.view; save(); render(); });
    document.querySelectorAll("[data-open-board]").forEach((b) => b.onclick = () => { const [g, bo] = b.dataset.openBoard.split(":"); state.activeGroupId = g; state.activeBoardId = bo; state.view = "board"; state.tab = "table"; save(); render(); });
    document.querySelectorAll("[data-modal]").forEach((b) => b.onclick = () => { modal = { type: b.dataset.modal }; render(); });
    document.querySelectorAll("[data-close], .modal-backdrop").forEach((x) => x.onclick = (e) => { if (e.target === x) { modal = null; save(); render(); } });
    document.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => { state.tab = b.dataset.tab; save(); render(); });
    document.querySelectorAll("[data-filter]").forEach((i) => i.oninput = () => { filters[i.dataset.filter] = i.value; render(); });
    document.querySelectorAll("[data-task-field]").forEach((i) => i.onchange = () => { const [id, key] = i.dataset.taskField.split(":"); setTask(id, key, i.value); });
    document.querySelectorAll("[data-add-task]").forEach((b) => b.onclick = () => addTask(b.dataset.addTask));
    document.querySelectorAll("[data-add-date]").forEach((b) => b.onclick = () => { const [s, d] = b.dataset.addDate.split(":"); addTask(s, d); });
    document.querySelectorAll("[data-delete]").forEach((b) => b.onclick = () => deleteTask(b.dataset.delete));
    document.querySelectorAll("[data-move]").forEach((b) => b.onclick = () => { const [id, dir] = b.dataset.move.split(":"); moveTask(id, Number(dir)); });
    document.querySelectorAll("[data-task]").forEach((b) => b.onclick = () => { modal = { type: "task", taskId: b.dataset.task }; render(); });
    document.querySelectorAll("[data-people]").forEach((b) => b.onclick = () => { modal = { type: "people", taskId: b.dataset.people }; render(); });
    document.querySelectorAll("[data-comment]").forEach((b) => b.onclick = () => { modal = { type: "comment", taskId: b.dataset.comment }; render(); });
    document.querySelectorAll("[data-pick]").forEach((b) => b.onclick = () => { const [id, field] = b.dataset.pick.split(":"); modal = { type: "pick", taskId: id, field, options: field === "status" ? statuses : priorities }; render(); });
    document.querySelectorAll("[data-pick-value]").forEach((b) => b.onclick = () => { setTask(modal.taskId, modal.field, b.dataset.pickValue); modal = null; save(); render(); });
    document.querySelectorAll("[data-person]").forEach((i) => i.onchange = () => { const f = findTask(modal.taskId); const id = i.dataset.person; setTask(f.task.id, "assignees", i.checked ? [...new Set([...f.task.assignees, id])] : f.task.assignees.filter((x) => x !== id)); modal = { type: "people", taskId: f.task.id }; render(); });
    document.querySelectorAll("[data-mention]").forEach((b) => b.onclick = () => { const u = state.users.find((x) => x.id === b.dataset.mention); const t = document.querySelector("#commentText"); t.value = `${t.value}${t.value ? " " : ""}@${u.name} `; });
    document.querySelectorAll("[data-save-comment]").forEach((b) => b.onclick = () => { setTask(b.dataset.saveComment, "comment", document.querySelector("#commentText").value); modal = null; save(); render(); });
    document.querySelector("[data-select-all]") && (document.querySelector("[data-select-all]").onchange = (e) => document.querySelectorAll(".row-check").forEach((x) => x.checked = e.target.checked));
    document.querySelectorAll("[data-toggle-section]").forEach((b) => b.onclick = () => { const s = board().sections.find((x) => x.id === b.dataset.toggleSection); s.collapsed = !s.collapsed; save(); render(); });
    document.querySelectorAll("[data-rename-section]").forEach((b) => b.onclick = () => { const s = board().sections.find((x) => x.id === b.dataset.renameSection); const name = prompt("Nome do grupo", s.name); if (name) s.name = name; save(); render(); });
    document.querySelectorAll("[data-rename-group]").forEach((b) => b.onclick = () => { const g = state.groups.find((x) => x.id === b.dataset.renameGroup); const name = prompt("Nome do grupo", g.name); if (name) g.name = name; save(); render(); });
    document.querySelectorAll("[data-rename-column]").forEach((b) => b.onclick = () => { const name = prompt("Nome da coluna", board().columns[Number(b.dataset.renameColumn)]); if (name) board().columns[Number(b.dataset.renameColumn)] = name; save(); render(); });
    document.querySelector("[data-create-group]") && (document.querySelector("[data-create-group]").onclick = createGroup);
    document.querySelectorAll("[data-create-board]").forEach((b) => b.onclick = () => createBoard(b.dataset.createBoard));
    document.querySelector("[data-add-section]") && (document.querySelector("[data-add-section]").onclick = () => { board().sections.push({ id: uid(), name: "NOVO GRUPO", collapsed: false, tasks: [] }); save(); render(); });
    document.querySelectorAll("[data-approve]").forEach((b) => b.onclick = () => { const [id, role] = b.dataset.approve.split(":"); approveUser(id, role); });
    document.querySelectorAll("[data-remove-user]").forEach((b) => b.onclick = () => { state.users = state.users.filter((u) => u.id !== b.dataset.removeUser); save(); render(); });
    document.querySelectorAll("[data-open-notice]").forEach((b) => b.onclick = () => { const n = state.notifications.find((x) => x.id === b.dataset.openNotice); if (!n) return; n.read = true; const f = findTask(n.taskId); if (f) { state.activeGroupId = f.group.id; state.activeBoardId = f.board.id; state.view = "board"; modal = { type: "task", taskId: f.task.id }; } save(); render(); });
    document.querySelector("#accountForm")?.addEventListener("submit", (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); Object.assign(user(), { name: d.name, username: d.username, email: d.email }); if (d.password) user().password = d.password; modal = null; save(); render(); });
    document.querySelector("[data-logout]") && (document.querySelector("[data-logout]").onclick = () => { state.currentUserId = null; save(); render(); });
    document.querySelector("#workspaceForm")?.addEventListener("submit", (e) => { e.preventDefault(); Object.assign(state.workspace, Object.fromEntries(new FormData(e.currentTarget))); modal = null; save(); render(); });
    document.querySelector("#boardForm")?.addEventListener("submit", (e) => { e.preventDefault(); Object.assign(board(), Object.fromEntries(new FormData(e.currentTarget))); modal = null; save(); render(); });
    document.querySelector("#columnForm")?.addEventListener("submit", (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); board().columns.push(d.name || d.type); modal = null; save(); render(); });
    document.querySelector("#taskForm")?.addEventListener("submit", (e) => { e.preventDefault(); const f = findTask(modal.taskId); Object.assign(f.task, Object.fromEntries(new FormData(e.currentTarget))); mentionedIds(f.task.comment).forEach((id) => notify(id, f.task, "mention", "Voce foi mencionado em um comentario.")); modal = null; save(); render(); });
  }

  save();
  render();
})();
