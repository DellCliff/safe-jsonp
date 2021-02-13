export function sandboxJsonp(url, callbackName) {
  return new Promise(success => {
    const iframe = document.createElement("iframe");
    iframe.height = "0";
    iframe.width = "0";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("sandbox", "allow-scripts");

    const script = document.createElement("script");
    script.innerHTML = `
      window.addEventListener('message', messageEvent => {
        window[messageEvent.data.callbackName] = result => window.parent.postMessage(result, messageEvent.origin);
        const script = document.createElement("script");
        script.src = messageEvent.data.url;
        document.body.appendChild(script);
      });
    `;

    const body = document.createElement("body");
    body.appendChild(script);

    iframe.srcdoc = body.outerHTML;

    window.addEventListener('message', messageEvent => {
      if (messageEvent.origin !== "null" || messageEvent.source !== iframe.contentWindow) {
        return;
      }

      iframe.parentNode.removeChild(iframe);

      success(messageEvent.data);
    });

    document.body.appendChild(iframe);
    iframe.contentWindow.postMessage({ url, callbackName }, "*");
  });
}
