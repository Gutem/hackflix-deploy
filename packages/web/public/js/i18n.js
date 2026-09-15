/**
 * i18n lightweight — Portuguese default, extensible.
 * Usage: H.t("Home") or H.t("conferences_page", { count: 239 })
 * @module hackflix-i18n
 */
var H = window.Hackflix;

/** @type {Record<string, Record<string, string>>} */
H._translations = {
  "pt-BR": {
    // Nav
    "Home": "Início",
    "Conferences": "Conferências",
    "Documentaries": "Documentários",
    "Topics": "Tópicos",
    "Search": "Buscar",
    "Profile": "Perfil",
    // Home page
    "Continue Watching": "Continuar Vendo",
    "New Additions": "Novas Adições",
    "All Talks": "Todas as Palestras",
    "View more": "Ver mais",
    "Play": "Assistir",
    // Auth
    "Sign In": "Entrar",
    "Username": "Usuário",
    "Password": "Senha",
    "Sign in to access premium content": "Entre para acessar conteúdo premium",
    "Username and password are required": "Usuário e senha são obrigatórios",
    "Login failed": "Falha no login",
    "Connection error": "Erro de conexão",
    "Sign Out": "Sair",
    // States
    "Loading...": "Carregando...",
    "No content": "Sem conteúdo",
    "Run the ingest pipeline to populate content.": "Execute o pipeline de ingestão para popular o conteúdo.",
    "Failed to load": "Falha ao carregar",
    "Content not available": "Conteúdo indisponível",
    "No results": "Nenhum resultado",
    "Try different keywords": "Tente palavras-chave diferentes",
    // Conference page
    "Conference Archive": "Arquivo de Conferências",
    "Security conference talks from around the world": "Palestras de segurança do mundo todo",
    "No conferences": "Nenhuma conferência",
    "No talks found": "Nenhuma palestra encontrada",
    "No documentaries": "Nenhum documentário",
    "No episodes found": "Nenhum episódio encontrado",
    "talks": "palestras",
    "episodes": "episódios",
    "Search talks...": "Buscar palestras...",
    "Searching...": "Buscando...",
    "Browse talks by topic": "Navegue por tópico",
    "All Topics": "Todos os Tópicos",
    "No talks for this topic": "Nenhuma palestra para este tópico",
    "Security documentaries and behind-the-scenes stories": "Documentários de segurança e histórias dos bastidores",
    // Watch
    "Watch on": "Assistir em",
    "Video not available": "Vídeo indisponível",
    "No content specified": "Nenhum conteúdo especificado",
    "Back": "Voltar",
    "Back to Home": "Voltar ao Início",
    "Back to Conferences": "Voltar às Conferências",
    "Back to Documentaries": "Voltar aos Documentários",
    "This content may require a premium subscription.": "Este conteúdo pode exigir assinatura premium.",
    // Units
    "min": "min",
    "watched": "assistido",
    "Search failed": "Falha na busca",
    "Failed": "Falhou",
    "No video": "Sem vídeo",
    "Invalid YouTube URL": "URL do YouTube inválida",
    // Profile
    "Tier": "Plano",
    "Email": "E-mail",
  }
};

/** @type {string} Current language */
H.lang = "pt-BR";

/**
 * Translate a string.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
H.t = function (key, vars) {
  var dict = H._translations[H.lang] || {};
  var result = dict[key] || key;
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      result = result.replace("{" + k + "}", String(vars[k]));
    });
  }
  return result;
};
