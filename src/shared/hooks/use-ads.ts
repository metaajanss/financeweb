import { useEffect } from 'react';

export function useAds() {
  useEffect(() => {
    fetch('/api/ads')
      .then(res => res.json())
      .then(data => {
        if (data) {
          // 1. Genel Reklam Kodu (Auto Ads vb. scriptler head'e)
          if (data.adsCode) {
            const temp = document.createElement('div');
            temp.innerHTML = data.adsCode.trim();
            const scriptTags = temp.getElementsByTagName('script');
            for (let i = 0; i < scriptTags.length; i++) {
              const newScript = document.createElement('script');
              if (scriptTags[i].src) {
                newScript.src = scriptTags[i].src;
                newScript.async = true;
                if (scriptTags[i].crossOrigin) {
                  newScript.crossOrigin = scriptTags[i].crossOrigin;
                }
              } else {
                newScript.innerHTML = scriptTags[i].innerHTML;
              }
              document.head.appendChild(newScript);
            }
          }

          // 2. Özel Reklam Alanları Entegrasyonu (Top, Mid, Bottom)
          const injectSlot = (selector: string, adCode: string) => {
            const slot = document.querySelector(selector);
            if (!slot || !adCode) return;
            slot.innerHTML = ''; // Placeholder'ı temizle
            
            const temp = document.createElement('div');
            temp.innerHTML = adCode.trim();
            
            // Script tag'lerini çalışabilir hale getir
            while(temp.firstChild) {
                if (temp.firstChild.nodeName === 'SCRIPT') {
                    const oldScript = temp.firstChild as HTMLScriptElement;
                    const newScript = document.createElement('script');
                    if (oldScript.src) {
                        newScript.src = oldScript.src;
                        newScript.async = true;
                        if (oldScript.crossOrigin) newScript.crossOrigin = oldScript.crossOrigin;
                    } else {
                        newScript.innerHTML = oldScript.innerHTML;
                    }
                    slot.appendChild(newScript);
                    temp.removeChild(oldScript);
                } else {
                    slot.appendChild(temp.firstChild);
                }
            }

            // Google Ads ins etiketi varsa tetikle
            if (adCode.includes('<ins')) {
                try {
                    (window as any).adsbygoogle = (window as any).adsbygoogle || [];
                    (window as any).adsbygoogle.push({});
                } catch(e) {}
            }
          };

          if (data.topAdCode) injectSlot('[data-ad="top"]', data.topAdCode);
          if (data.midAdCode) injectSlot('[data-ad="mid"]', data.midAdCode);
          if (data.bottomAdCode) injectSlot('[data-ad="bottom"]', data.bottomAdCode);
        }
      })
      .catch(err => console.error('Failed to load ads config:', err));
  }, []);
}
