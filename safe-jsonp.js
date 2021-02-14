function createSandbox() {
  return new Promise(success => {
    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.setAttribute("sandbox", "allow-scripts");

    {
      const script = document.createElement("script");
      script.textContent = `
        window.onmessage = ({data}) => {
          const script = document.createElement("script");
          script.src = data.url;

          window[data.callbackName] = response => {
            window.parent.postMessage({response, requestId: data.requestId}, "*");

            document.body.removeChild(script);
            delete window[data.callbackName];
          };

          document.body.appendChild(script);
        };
      `;

      const body = document.createElement("body");
      body.appendChild(script);

      iframe.srcdoc = body.outerHTML;
    }

    iframe.onload = () => {
      success(iframe);
      iframe.onload = null;
    };

    document.body.appendChild(iframe);
  });
}

function sandboxJsonp(sandbox, url, callbackName) {
  return new Promise(success => {
    const request = { url, callbackName, requestId: Math.random() };

    function onMessage({source, data}) {
      if (source !== sandbox.contentWindow || data.requestId !== request.requestId) {
        return;
      }

      success(data.response);

      window.removeEventListener('message', onMessage);
    }
    window.addEventListener('message', onMessage);

    sandbox.contentWindow.postMessage(request, "*");
  });
}

export function jsonpSandbox() {
  const sandbox = createSandbox();
  return async (url, callbackName) => await sandboxJsonp(await sandbox, url, callbackName);
}
