/** Runs before first paint so dark mode doesn't flash light. */
export const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
