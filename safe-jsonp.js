export const errorCodeOnWindowError = "a17fccef-ddcf-4386-8f31-05cd6d9490f0";
export const errorCodeOnScriptError = "ee8c8441-e594-440e-832e-8f3d023fbe87";
export const errorCodeOnTimeout = "be868a85-9ff3-4c69-8ee6-abd7576e3398";

function createSandbox() {
  const iframe = document.createElement("iframe");
  iframe.hidden = true;
  iframe.setAttribute("sandbox", "allow-scripts");

  {
    const script = document.createElement("script");
    script.textContent = `
      window.onmessage = ({data}) => {
        const script = document.createElement("script");
        script.src = data.url;
        let timeoutToken;

        function cleanup() {
          delete window[data.callbackName];
          script.onload = null;
          script.onerror = null;
          window.onerror = null;
          clearTimeout(timeoutToken);
          try {
            document.body.removeChild(script);
          } catch (ignore) {}
        }

        window.onerror = () => {
          cleanup();
          window.parent.postMessage({error: data.errorCodeOnWindowError}, "*");
        };

        script.onerror = () => {
          cleanup();
          window.parent.postMessage({error: data.errorCodeOnScriptError}, "*");
        };

        script.onload = () => {
          timeoutToken = setTimeout(
            () => {
              cleanup();
              window.parent.postMessage({error: data.errorCodeOnTimeout}, "*");
            },
            data.timeout);
        };

        window[data.callbackName] = response => {
          cleanup();
          window.parent.postMessage({response}, "*");
        };

        document.body.appendChild(script);
      };
    `;

    const body = document.createElement("body");
    body.appendChild(script);

    iframe.srcdoc = body.outerHTML;
  }

  return new Promise(resolve => {
    iframe.onload = () => {
      resolve(iframe);
      iframe.onload = null;
    };

    document.body.appendChild(iframe);
  });
}

function sandboxJsonp(sandbox, url, callbackName, timeout) {
  return new Promise((resolve, reject) => {
    function onMessage({source, data}) {
      if (source !== sandbox.contentWindow) {
        return;
      }

      if (data.response) {
        resolve(data.response);
      } else {
        reject(data.error);
      }

      window.removeEventListener('message', onMessage);
    }
    window.addEventListener('message', onMessage);

    sandbox.contentWindow.postMessage({url, callbackName, timeout, errorCodeOnWindowError, errorCodeOnScriptError, errorCodeOnTimeout}, "*");
  });
}

export function jsonpSandbox() {
  const sandbox = createSandbox();
  return async (url, callbackName, timeout = 1000) => await sandboxJsonp(await sandbox, url, callbackName, timeout);
}
