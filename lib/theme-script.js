export const THEME_KEY = "theme";
/** Runs in <head> before the page paints, so there is no flash of the wrong theme. A saved "light" or "dark" wins; otherwise the device setting decides. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
