(function(window, document) {
    'use strict';
    function hexToRgba(hex, opacity) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    const EffectgroepChatCombinedLoader = {
        config: {
            baseUrl: WIDGET_CONFIG.baseUrl,
            inboxToken: WIDGET_CONFIG.inboxToken
        },
        modalIsOpen: false,
        floatingVisible: false,
        floatingDismissed: false,
        inlineHasBeenSeen: false,
        init: function(userConfig = {}) {
            if (userConfig.baseUrl) this.config.baseUrl = userConfig.baseUrl;
            if (userConfig.inboxToken) this.config.inboxToken = userConfig.inboxToken;

            if (!this.config.inboxToken) {
                console.error('EffectgroepChatCombined: inboxToken is required');
                return;
            }
            this.createElements();
        },
        createElements: function() {
            const inlineContainer = document.createElement('div');
            inlineContainer.id = 'effectgroep-chat-widget-container';
            inlineContainer.style.cssText = 'width:100%;max-width:46rem;margin:0 auto;';

            const inlineIframe = document.createElement('iframe');
            inlineIframe.id = 'effectgroep-chat-inline-iframe';
            inlineIframe.style.cssText = 'width:100%;height:500px;border:none;overflow:visible;background:transparent;';
            inlineIframe.setAttribute('scrolling', 'no');
            inlineIframe.setAttribute('allowtransparency', 'true');
            const floatingContainer = document.createElement('div');
            floatingContainer.id = 'effectgroep-chat-floating-container';
            floatingContainer.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);width:100%;max-width:46rem;padding:0 1rem;z-index:998;pointer-events:none;display:none;opacity:0;';

            const floatingIframe = document.createElement('iframe');
            floatingIframe.id = 'effectgroep-chat-floating-iframe';
            floatingIframe.style.cssText = 'width:100%;height:140px;border:none;overflow:hidden;background:transparent;pointer-events:auto;';
            floatingIframe.setAttribute('scrolling', 'no');
            floatingIframe.setAttribute('allowtransparency', 'true');
            const modalIframe = document.createElement('iframe');
            modalIframe.id = 'effectgroep-chat-modal-iframe';
            modalIframe.style.cssText = 'position:fixed;inset:0;width:100vw;border:none;z-index:999999;display:none;';

            const initialHeight = window.innerHeight;
            modalIframe.style.height = initialHeight + 'px';
            function updateModalIframeHeight() {
                const viewportHeight = window.innerHeight;
                modalIframe.style.height = viewportHeight + 'px';
            }
            window.addEventListener('resize', updateModalIframeHeight);
            const targetElement = document.getElementById('effectgroep-chat-target');
            if (targetElement) {
                targetElement.appendChild(inlineContainer);
            } else {
                document.body.appendChild(inlineContainer);
            }
            inlineContainer.appendChild(inlineIframe);
            floatingContainer.appendChild(floatingIframe);
            document.body.appendChild(floatingContainer);
            document.body.appendChild(modalIframe);
            const inlineContent = this.generateInlineIframeContent();
            const floatingContent = this.generateFloatingIframeContent();
            const modalContent = this.generateModalContent();

            const inlineBlob = new Blob([inlineContent], { type: 'text/html' });
            const floatingBlob = new Blob([floatingContent], { type: 'text/html' });
            const modalBlob = new Blob([modalContent], { type: 'text/html' });

            inlineIframe.src = URL.createObjectURL(inlineBlob);
            floatingIframe.src = URL.createObjectURL(floatingBlob);
            modalIframe.src = URL.createObjectURL(modalBlob);
            this.inlineContainer = inlineContainer;
            this.inlineIframe = inlineIframe;
            this.floatingContainer = floatingContainer;
            this.floatingIframe = floatingIframe;
            this.modalIframe = modalIframe;

            this.setupMessageHandling();
            this.setupIntersectionObserver();
        },
        setupIntersectionObserver: function() {
            const self = this;
            this.observer = new IntersectionObserver(function(entries) {
                entries.forEach(function(entry) {
                    if (entry.isIntersecting) {
                        self.inlineHasBeenSeen = true;
                        self.hideFloatingBar();
                    } else if (self.inlineHasBeenSeen) {
                        self.showFloatingBar();
                    } else {
                        self.hideFloatingBar();
                    }
                });
            }, { threshold: 0 });
            this.observer.observe(this.inlineContainer);
        },
        showFloatingBar: function() {
            if (this.floatingVisible || this.modalIsOpen || this.floatingDismissed) return;
            this.floatingVisible = true;
            const container = this.floatingContainer;
            container.style.display = '';
            container.style.transition = 'none';
            container.style.opacity = '0';
            container.style.transform = 'translateX(-50%) translateY(20px)';
            container.offsetHeight;
            container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateX(-50%) translateY(0)';
        },
        hideFloatingBar: function() {
            if (!this.floatingVisible) return;
            this.floatingVisible = false;
            const container = this.floatingContainer;
            container.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            container.style.opacity = '0';
            container.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(function() {
                container.style.display = 'none';
            }, 300);
        },
        setupMessageHandling: function() {
            const self = this;
            window.addEventListener('message', function(event) {
                if (event.data.type === 'effectgroep-expand') {
                    self.modalIsOpen = true;
                    if (self.floatingVisible) {
                        self.floatingVisible = false;
                        self.floatingContainer.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        self.floatingContainer.style.opacity = '0';
                        self.floatingContainer.style.transform = 'translateX(-50%) translateY(20px)';
                        setTimeout(function() {
                            self.floatingContainer.style.display = 'none';
                        }, 300);
                    }
                    self.modalIframe.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                    self.modalIframe.contentWindow.postMessage({
                        type: 'effectgroep-init-modal',
                        message: event.data.message,
                        config: self.config
                    }, '*');
                }
                if (event.data.type === 'effectgroep-collapse') {
                    self.modalIsOpen = false;
                    self.modalIframe.style.display = 'none';
                    document.body.style.overflow = '';
                    setTimeout(function() {
                        var rect = self.inlineContainer.getBoundingClientRect();
                        var inViewport = rect.bottom > 0 && rect.top < window.innerHeight;
                        if (self.inlineHasBeenSeen && !inViewport) {
                            self.showFloatingBar();
                        }
                    }, 150);
                }
                if (event.data.type === 'effectgroep-dismiss-floating') {
                    self.floatingDismissed = true;
                    self.hideFloatingBar();
                }
            });
        },
        generateInlineIframeContent: function() {
            const config = this.config;
            const colors = WIDGET_CONFIG.colors;
            const glowGradient = colors.glow.join(', ');
            const suggestionsHTML = WIDGET_CONFIG.suggestions.map(q =>
                `<button class="suggestion-btn" data-question="${q}">${q}</button>`
            ).join('');
            return `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://use.typekit.net/wdo8gzz.css">
    <style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
:root{--eg-pink:${colors.sendButton};--eg-off-black:#101010;--eg-neutral-darker:#222;--eg-neutral-dark:#444;--eg-white:#ffffff;--eg-text-muted:rgba(255,255,255,0.6);--eg-font-family:'proxima-nova',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
html,body{background:transparent;font-family:var(--eg-font-family);overflow:hidden;}
.widget-container{padding:30px;padding-bottom:20px;}
.ai-chat-wrapper{position:relative;width:100%;}
.ai-chat{position:relative;width:100%;height:72px;}
.ai-chat::before,.ai-chat::after{content:"";position:absolute;top:-1px;left:-1px;width:calc(100% + 2px);height:calc(100% + 2px);background:linear-gradient(45deg,${glowGradient});background-size:400%;z-index:20;animation:glowbox 20s linear infinite;}
.ai-chat::after{filter:blur(10px);z-index:19;}
@keyframes glowbox{0%{background-position:0 0;}50%{background-position:400% 0;}100%{background-position:0 0;}}
.input-container{background-color:var(--eg-neutral-darker);width:100%;height:100%;padding:1rem;position:relative;display:flex;align-items:center;z-index:21;}
.chat-input{flex:1;background-color:var(--eg-neutral-dark);border:none;outline:none;font-size:1rem;padding:0 75px 0 1rem;height:100%;color:var(--eg-white);font-family:var(--eg-font-family);z-index:100;position:absolute;inset:0;text-overflow:ellipsis;}
.chat-input::placeholder{color:var(--eg-text-muted);opacity:1;}
.chat-input:focus::placeholder{color:var(--eg-text-muted);opacity:1;}
.send-btn{position:absolute;right:10px;top:10px;width:52px;height:52px;border-radius:100%;background-color:var(--eg-pink);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:110;transition:transform 0.2s ease,box-shadow 0.2s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;}
.send-btn:hover{transform:scale(1.05);box-shadow:0 0 20px ${hexToRgba(colors.sendButtonHoverGlow, colors.sendButtonHoverGlowOpacity)};}
.send-btn svg{width:20px;height:20px;fill:${colors.arrow};}
.suggestions{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto auto;grid-column-gap:1rem;grid-row-gap:1rem;margin-top:1.5rem;padding:0 5%;}
.suggestion-btn{background-color:${colors.suggestionBackground};border:1px solid ${hexToRgba(colors.suggestionBorder, colors.suggestionBorderOpacity)};border-radius:80px;padding:0.75rem 1rem;color:${hexToRgba(colors.suggestionText, colors.suggestionTextOpacity)};font-size:1rem;font-family:var(--eg-font-family);cursor:pointer;transition:all 0.2s ease;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;max-width:100%;}
.suggestion-btn:hover{background-color:${hexToRgba(colors.suggestionHoverBackground, colors.suggestionHoverBackgroundOpacity)};border-color:${hexToRgba(colors.suggestionHoverBorder, colors.suggestionHoverBorderOpacity)};color:${colors.suggestionHoverText};}
@media (max-width:500px){.suggestions{grid-template-columns:1fr;padding:0;}.suggestion-btn{font-size:0.875rem;}}
@media (max-width:480px){.chat-input{font-size:0.875rem;}.send-btn{width:44px;height:44px;right:8px;top:14px;}}
    </style>
</head>
<body>
    <div class="widget-container">
        <div class="ai-chat-wrapper">
            <div class="ai-chat">
                <div class="input-container">
                    <input type="text" class="chat-input" id="chat-input" placeholder="${WIDGET_CONFIG.text.placeholderFull}" autocomplete="off" />
                    <button type="button" class="send-btn" id="send-btn" aria-label="Verstuur">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path fill="${colors.arrow}" d="m11.293 17.293l1.414 1.414L19.414 12l-6.707-6.707l-1.414 1.414L15.586 11H6v2h9.586z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        <div class="suggestions">
            ${suggestionsHTML}
        </div>
    </div>
    <script>
        (function() {
            const input = document.getElementById('chat-input');
            const sendBtn = document.getElementById('send-btn');
            const suggestions = document.querySelectorAll('.suggestion-btn');
            const text = ${JSON.stringify(WIDGET_CONFIG.text)};
            function sendMessage(message) {
                if (!message.trim()) return;
                window.parent.postMessage({
                    type: 'effectgroep-expand',
                    message: message.trim()
                }, '*');
                input.value = '';
            }
            sendBtn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                sendMessage(input.value);
            });
            sendBtn.addEventListener('click', function(e) {
                if (!e.detail || e.detail === 0) {
                    sendMessage(input.value);
                }
            });
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage(input.value);
                }
            });
            suggestions.forEach(btn => {
                btn.addEventListener('click', () => {
                    sendMessage(btn.dataset.question);
                });
            });
            function updatePlaceholder() {
                if (window.innerWidth < 400) {
                    input.placeholder = text.placeholderShort;
                } else if (window.innerWidth < 500) {
                    input.placeholder = text.placeholderMedium;
                } else {
                    input.placeholder = text.placeholderFull;
                }
            }
            updatePlaceholder();
            window.addEventListener('resize', updatePlaceholder);
        })();
    <\/script>
</body>
</html>`;
        },
        generateFloatingIframeContent: function() {
            const config = this.config;
            const colors = WIDGET_CONFIG.colors;
            const glowGradient = colors.glow.join(', ');
            return `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://use.typekit.net/wdo8gzz.css">
    <style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
:root{--eg-pink:${colors.sendButton};--eg-neutral-darker:#222;--eg-neutral-dark:#444;--eg-white:#ffffff;--eg-text-muted:rgba(255,255,255,0.6);--eg-font-family:'proxima-nova',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
html,body{background:transparent;font-family:var(--eg-font-family);overflow:hidden;}
.widget-container{position:relative;padding:30px;}
.ai-chat-wrapper{position:relative;width:100%;}
.ai-chat{position:relative;width:100%;}
.ai-chat::before,.ai-chat::after{content:"";position:absolute;top:-1px;left:-1px;width:calc(100% + 2px);height:calc(100% + 2px);background:linear-gradient(45deg,${glowGradient});background-size:400%;z-index:20;animation:glowbox 20s linear infinite;}
.ai-chat::after{filter:blur(10px);z-index:19;}
@keyframes glowbox{0%{background-position:0 0;}50%{background-position:400% 0;}100%{background-position:0 0;}}
.input-container{background-color:var(--eg-neutral-darker);width:100%;height:72px;padding:1rem;position:relative;display:flex;align-items:center;z-index:21;}
.chat-input{flex:1;background-color:var(--eg-neutral-dark);border:none;outline:none;font-size:1rem;padding:0 75px 0 1rem;height:100%;color:var(--eg-white);font-family:var(--eg-font-family);z-index:100;position:absolute;inset:0;text-overflow:ellipsis;}
.chat-input::placeholder{color:var(--eg-text-muted);opacity:1;}
.chat-input:focus::placeholder{color:var(--eg-text-muted);opacity:1;}
.send-btn{position:absolute;right:10px;top:10px;width:52px;height:52px;border-radius:100%;background-color:var(--eg-pink);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:110;transition:transform 0.2s ease,box-shadow 0.2s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;}
.send-btn:hover{transform:scale(1.05);box-shadow:0 0 20px ${hexToRgba(colors.sendButtonHoverGlow, colors.sendButtonHoverGlowOpacity)};}
.send-btn svg{width:20px;height:20px;fill:${colors.arrow};}
.dismiss-btn{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:var(--eg-neutral-darker);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:25;transition:background-color 0.2s ease;color:#ffffff;padding:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;}
.dismiss-btn:hover{background-color:#333;}
.dismiss-btn svg{width:12px;height:12px;}
@media (max-width:480px){.chat-input{font-size:1rem;}.send-btn{width:44px;height:44px;right:8px;top:14px;}.dismiss-btn{top:6px;right:2px;width:22px;height:22px;}.dismiss-btn svg{width:11px;height:11px;}}
    </style>
</head>
<body>
    <div class="widget-container">
        <button class="dismiss-btn" id="dismiss-btn" aria-label="Sluiten">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M4 4l8 8M12 4l-8 8"/>
            </svg>
        </button>
        <div class="ai-chat-wrapper">
            <div class="ai-chat">
                <div class="input-container">
                    <input type="text" class="chat-input" id="chat-input" placeholder="${WIDGET_CONFIG.text.placeholderFull}" autocomplete="off" />
                    <button type="button" class="send-btn" id="send-btn" aria-label="Verstuur">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <path fill="${colors.arrow}" d="m11.293 17.293l1.414 1.414L19.414 12l-6.707-6.707l-1.414 1.414L15.586 11H6v2h9.586z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
    <script>
        (function() {
            const input = document.getElementById('chat-input');
            const sendBtn = document.getElementById('send-btn');
            const text = ${JSON.stringify(WIDGET_CONFIG.text)};
            function sendMessage(message) {
                if (!message.trim()) return;
                window.parent.postMessage({
                    type: 'effectgroep-expand',
                    message: message.trim()
                }, '*');
                input.value = '';
            }
            function updatePlaceholder() {
                if (window.innerWidth < 400) {
                    input.placeholder = text.placeholderShort;
                } else if (window.innerWidth < 500) {
                    input.placeholder = text.placeholderMedium;
                } else {
                    input.placeholder = text.placeholderFull;
                }
            }
            updatePlaceholder();
            window.addEventListener('resize', updatePlaceholder);
            sendBtn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                sendMessage(input.value);
            });
            sendBtn.addEventListener('click', function(e) {
                if (!e.detail || e.detail === 0) {
                    sendMessage(input.value);
                }
            });
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendMessage(input.value);
                }
            });
            document.getElementById('dismiss-btn').addEventListener('click', function(e) {
                e.preventDefault();
                window.parent.postMessage({ type: 'effectgroep-dismiss-floating' }, '*');
            });
        })();
    <\/script>
</body>
</html>`;
        },
        generateModalContent: function() {
            const config = this.config;
            const colors = WIDGET_CONFIG.colors;
            const glowGradient = colors.glow.join(', ');
            return `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://use.typekit.net/wdo8gzz.css">
    <style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
:root{--eg-pink:${colors.sendButton};--eg-off-black:#101010;--eg-neutral-darker:#222;--eg-neutral-dark:#444;--eg-neutral-darkest:#111;--eg-white:#ffffff;--eg-text-muted:rgba(255,255,255,0.6);--eg-font-family:'proxima-nova',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
html,body{height:100vh;height:100svh;font-family:var(--eg-font-family);background:transparent;}
.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100vh;height:100svh;display:flex;justify-content:center;align-items:center;opacity:0;visibility:hidden;transition:opacity 0.4s cubic-bezier(0.4,0,0.2,1),visibility 0.4s cubic-bezier(0.4,0,0.2,1);}
.modal-overlay.active{opacity:1;visibility:visible;}
.modal-background{position:absolute;inset:0;background:rgba(0,0,0,0);backdrop-filter:blur(0px);-webkit-backdrop-filter:blur(0px);transition:background 0.5s cubic-bezier(0.4,0,0.2,1),backdrop-filter 0.5s cubic-bezier(0.4,0,0.2,1);}
.modal-overlay.active .modal-background{background:rgba(0,0,0,0.65);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}
.modal-content{position:relative;width:100%;height:100vh;height:100svh;padding:4rem 5% 0 5%;display:flex;flex-direction:column;overflow:hidden;z-index:1;opacity:0;transform:translateY(40px);transition:opacity 0.4s cubic-bezier(0.4,0,0.2,1) 0.1s,transform 0.5s cubic-bezier(0.4,0,0.2,1) 0.1s;}
.modal-overlay.active .modal-content{opacity:1;transform:translateY(0);}
.close-btn{position:absolute;top:2rem;right:2rem;width:48px;height:48px;background:transparent;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;transition:transform 0.2s ease;color:var(--eg-white);}
.close-btn:hover{transform:scale(1.1);}
.close-btn svg{width:32px;height:32px;fill:currentColor;}
.chat-container{width:100%;max-width:48rem;margin:0 auto;display:flex;flex-direction:column;text-align:left;flex:1;min-height:0;padding-bottom:150px;}
.chat-header h2{font-size:1.5rem;font-weight:900;line-height:1.4;color:var(--eg-white);margin:0 0 1rem 0;padding:0 2rem;}.header-line{margin:0.75rem 2rem 0;border:none;border-top:1px solid #ffffff;}
.message-window{flex:1;display:flex;flex-direction:column;gap:2rem;padding:1rem 0 2rem 0;overflow-y:auto;overflow-x:hidden;min-height:0;}
.message-window::before{content:'';flex:1;}
.message-window::-webkit-scrollbar{width:6px;}
.message-window::-webkit-scrollbar-track{background:transparent;}
.message-window::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.2);border-radius:3px;}
.message-wrapper{margin:0 2rem;scroll-margin-top:40px;}
.message-wrapper .message-text{font-size:1.125rem;line-height:1.6;color:var(--eg-white);}
.message-wrapper .message-text p{margin:0 0 1rem 0;}
.message-wrapper .message-text p:last-child{margin-bottom:0;}
.message-wrapper .message-text ol,.message-wrapper .message-text ul{margin:1rem 0;padding-left:1.5rem;}
.message-wrapper .message-text li{margin-bottom:0.5rem;}
.message-wrapper .message-text strong{font-weight:700;}
.message-wrapper .message-text em{font-style:italic;}
.message-wrapper .message-text code{background:rgba(255,255,255,0.1);padding:0.15rem 0.4rem;border-radius:4px;font-family:'SF Mono',Monaco,'Courier New',monospace;font-size:0.9em;}
.message-wrapper .message-text a{color:${colors.agentMessageLink};text-decoration:underline;}
.message-wrapper.user-message{background-color:${colors.userMessage};border-radius:1rem;max-width:75%;padding:1rem;margin-left:auto;}
.message-wrapper.user-message .message-text{color:${colors.userMessageText};font-size:1rem;}
.message-wrapper.user-message .message-text a{color:var(--eg-white);}
@keyframes message-fade-in{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.message-wrapper.animate{animation:message-fade-in 0.3s ease-out;}
.typing-indicator{display:none;margin:0 2rem;}
.typing-indicator.show{display:block;}
.typing-dots{display:inline-flex;gap:6px;padding:12px 16px;background:rgba(255,255,255,0.05);border-radius:1rem;}
.typing-dot{width:8px;height:8px;border-radius:50%;background:var(--eg-text-muted);animation:typing 1.2s ease-in-out infinite;}
.typing-dot:nth-child(1){animation-delay:0s;}
.typing-dot:nth-child(2){animation-delay:0.15s;}
.typing-dot:nth-child(3){animation-delay:0.3s;}
@keyframes typing{0%,60%,100%{transform:translateY(0);opacity:0.4;}30%{transform:translateY(-8px);opacity:1;}}
.input-box{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);width:100%;max-width:48rem;padding:0 2rem;z-index:100;}
.input-wrapper{position:relative;width:100%;z-index:25;contain:layout style;}
.input-wrapper::before,.input-wrapper::after{content:"";position:absolute;top:-1px;left:-1px;width:calc(100% + 2px);height:calc(100% + 2px);background:linear-gradient(45deg,${glowGradient});background-size:400%;z-index:20;animation:glowbox 20s linear infinite;will-change:background-position;transform:translateZ(0);backface-visibility:hidden;}
.input-wrapper::after{filter:blur(10px);z-index:19;}
@keyframes glowbox{0%{background-position:0 0;}50%{background-position:400% 0;}100%{background-position:0 0;}}
.input-container{background-color:var(--eg-neutral-darker);width:100%;height:72px;padding:1rem;position:relative;display:flex;align-items:center;z-index:21;}
.chat-input{flex:1;background-color:var(--eg-neutral-dark);border:none;outline:none;font-size:1rem;padding:0 75px 0 1rem;height:100%;color:var(--eg-white);font-family:var(--eg-font-family);z-index:100;position:absolute;inset:0;text-overflow:ellipsis;}
.chat-input::placeholder{color:var(--eg-text-muted);opacity:1;}
.chat-input:focus::placeholder{color:var(--eg-text-muted);opacity:1;}
.send-btn{position:absolute;right:10px;top:10px;width:52px;height:52px;border-radius:100%;background-color:var(--eg-pink);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:110;transition:transform 0.2s ease,box-shadow 0.2s ease;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;}
.send-btn:hover:not(:disabled){transform:scale(1.05);box-shadow:0 0 20px ${hexToRgba(colors.sendButtonHoverGlow, colors.sendButtonHoverGlowOpacity)};}
.send-btn:disabled{opacity:0.5;cursor:not-allowed;}
.send-btn svg{width:20px;height:20px;fill:${colors.arrow};}
.input-disclaimer{position:absolute;bottom:-22px;left:0;width:100%;text-align:center;font-size:11px;color:rgba(255,255,255,0.35);pointer-events:auto;margin:0;padding:0;}
.input-disclaimer a{color:rgba(255,255,255,0.35);text-decoration:none;}
.input-disclaimer a:hover{color:rgba(255,255,255,0.5);text-decoration:underline;}
@media (max-width:768px){.modal-content{padding:2rem 1rem;padding-bottom:6rem;}.chat-container{padding-bottom:30px;}.chat-header h2{font-size:1.25rem;padding:0 1rem;}.header-line{margin:0.75rem 1rem 0;}.message-wrapper{margin:0 1rem;}.message-wrapper .message-text{font-size:1rem;}.input-box{padding:0 1rem;bottom:1rem;}.close-btn{top:1rem;right:1rem;}.input-disclaimer{bottom:-18px;font-size:10px;}}
@media (max-width:480px){.chat-input{font-size:1rem;}.send-btn{width:44px;height:44px;right:8px;top:14px;}}
    </style>
</head>
<body>
    <div class="modal-overlay" id="modal-overlay">
        <div class="modal-background" id="modal-background"></div>
        <div class="modal-content">
            <button class="close-btn" id="close-btn" aria-label="Sluiten">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
                    <path fill="currentColor" d="M208.5 191.5a12 12 0 0 1 0 17a12.1 12.1 0 0 1-17 0L128 145l-63.5 63.5a12.1 12.1 0 0 1-17 0a12 12 0 0 1 0-17L111 128L47.5 64.5a12 12 0 0 1 17-17L128 111l63.5-63.5a12 12 0 0 1 17 17L145 128Z"/>
                </svg>
            </button>
            <div class="chat-container">
                <div class="chat-header">
                    <h2>${WIDGET_CONFIG.text.chatHeader}</h2>
                    <div class="header-line"></div>
                </div>
                <div class="message-window" id="message-window"></div>
                <div class="typing-indicator" id="typing-indicator">
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            </div>
            <div class="input-box">
                <div class="input-wrapper">
                    <div class="input-container">
                        <input type="text" class="chat-input" id="chat-input" placeholder="${WIDGET_CONFIG.text.placeholderFull}" autocomplete="off" />
                        <button type="button" class="send-btn" id="send-btn" aria-label="Verstuur">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <path fill="${colors.arrow}" d="m11.293 17.293l1.414 1.414L19.414 12l-6.707-6.707l-1.414 1.414L15.586 11H6v2h9.586z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <p class="input-disclaimer">Spark* kan fouten maken. Deel je feedback via <a href="mailto:spark@effectgroep.nl">spark@effectgroep.nl</a></p>
            </div>
        </div>
    </div>

    <script>
        (function() {
            let config = { baseUrl: '${config.baseUrl}', inboxToken: '${config.inboxToken}' };
            const wsProtocol = config.baseUrl.startsWith('https') ? 'wss' : 'ws';
            const baseHost = config.baseUrl.replace(/^https?:\\/\\//, '');
            const websocketUrl = wsProtocol + '://' + baseHost + '/cable';

            const state = {
                sourceId: null,
                contactId: null,
                conversationId: null,
                pubsubToken: null,
                isConnected: false,
                websocket: null,
                reconnectAttempts: 0,
                maxReconnectAttempts: 5,
                pollingInterval: 3000,
                pollingIntervalId: null,
                messageIds: new Set()
            };

            const text = ${JSON.stringify(WIDGET_CONFIG.text)};

            const modalOverlay = document.getElementById('modal-overlay');
            const modalBackground = document.getElementById('modal-background');
            const closeBtn = document.getElementById('close-btn');
            const messagesContainer = document.getElementById('message-window');
            const chatInput = document.getElementById('chat-input');
            const sendBtn = document.getElementById('send-btn');
            const typingIndicator = document.getElementById('typing-indicator');

            function updateModalPlaceholder() {
                if (window.innerWidth < 400) {
                    chatInput.placeholder = text.placeholderShort;
                } else if (window.innerWidth < 500) {
                    chatInput.placeholder = text.placeholderMedium;
                } else {
                    chatInput.placeholder = text.placeholderFull;
                }
            }
            updateModalPlaceholder();
            window.addEventListener('resize', updateModalPlaceholder);

            let resizeTimeout;
            function setModalHeight() {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(function() {
                    const viewportHeight = window.visualViewport
                        ? window.visualViewport.height
                        : window.innerHeight;
                    if (modalOverlay) {
                        modalOverlay.style.height = viewportHeight + 'px';
                    }
                    const modalContent = document.querySelector('.modal-content');
                    if (modalContent) {
                        modalContent.style.height = viewportHeight + 'px';
                        const safeAreaBottom = getComputedStyle(document.documentElement)
                            .getPropertyValue('--safe-area-inset-bottom') || '0px';
                        if (safeAreaBottom !== '0px') {
                            modalContent.style.paddingBottom = safeAreaBottom;
                        }
                    }
                }, 150);
            }
            setModalHeight();
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', setModalHeight);
            }
            window.addEventListener('resize', setModalHeight);
            function loadSession() {
                state.sourceId = localStorage.getItem('cw_effectgroep_source_id');
                state.contactId = localStorage.getItem('cw_effectgroep_contact_id');
                state.conversationId = localStorage.getItem('cw_effectgroep_conversation_id');
                state.pubsubToken = localStorage.getItem('cw_effectgroep_pubsub_token');
            }
            function saveSession() {
                if (state.sourceId) localStorage.setItem('cw_effectgroep_source_id', state.sourceId);
                if (state.contactId) localStorage.setItem('cw_effectgroep_contact_id', state.contactId);
                if (state.conversationId) localStorage.setItem('cw_effectgroep_conversation_id', state.conversationId);
                if (state.pubsubToken) localStorage.setItem('cw_effectgroep_pubsub_token', state.pubsubToken);
            }
            function clearSession() {
                state.sourceId = null;
                state.contactId = null;
                state.conversationId = null;
                state.pubsubToken = null;
                localStorage.removeItem('cw_effectgroep_source_id');
                localStorage.removeItem('cw_effectgroep_contact_id');
                localStorage.removeItem('cw_effectgroep_conversation_id');
                localStorage.removeItem('cw_effectgroep_pubsub_token');
            }
            async function validateAndRestoreSession() {
                if (!state.sourceId || !state.conversationId) {
                    return false;
                }
                try {
                    const response = await fetch(
                        config.baseUrl + '/public/api/v1/inboxes/' + config.inboxToken +
                        '/contacts/' + state.sourceId + '/conversations/' + state.conversationId + '/messages'
                    );
                    if (response.ok) {
                        const messages = await response.json();
                        if (messages && messages.length > 0) {
                            renderMessages(messages);
                            return true;
                        } else {
                            return true;
                        }
                    } else if (response.status === 404 || response.status === 401) {
                        clearSession();
                        return false;
                    } else {
                        return false;
                    }
                } catch (error) {
                    return false;
                }
            }
            async function createContact() {
                if (state.sourceId && state.contactId && state.pubsubToken) {
                    return true;
                }
                try {
                    const response = await fetch(config.baseUrl + '/public/api/v1/inboxes/' + config.inboxToken + '/contacts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                    });
                    if (response.ok) {
                        const data = await response.json();
                        state.sourceId = data.source_id;
                        state.contactId = data.id;
                        state.pubsubToken = data.pubsub_token;
                        saveSession();
                        return true;
                    }
                } catch (error) {}
                return false;
            }
            async function createConversation() {
                if (state.conversationId) {
                    return true;
                }
                if (!state.sourceId) {
                    const created = await createContact();
                    if (!created) return false;
                }
                try {
                    const response = await fetch(config.baseUrl + '/public/api/v1/inboxes/' + config.inboxToken + '/contacts/' + state.sourceId + '/conversations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        state.conversationId = data.id;
                        saveSession();
                        return true;
                    }
                } catch (error) {}
                return false;
            }
            async function sendMessage(content) {
                if (!state.conversationId) {
                    const created = await createConversation();
                    if (!created) {
                        return false;
                    }
                }
                try {
                    showTypingIndicator();
                    const response = await fetch(config.baseUrl + '/public/api/v1/inboxes/' + config.inboxToken + '/contacts/' + state.sourceId + '/conversations/' + state.conversationId + '/messages', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: content })
                    });
                    if (response.ok) {
                        if (!state.isConnected && state.pubsubToken) {
                            connectWebSocket();
                        }
                        return true;
                    }
                } catch (error) {
                    hideTypingIndicator();
                }
                return false;
            }

            async function fetchMessages() {
                if (!state.conversationId || !state.sourceId) return;
                try {
                    const response = await fetch(config.baseUrl + '/public/api/v1/inboxes/' + config.inboxToken + '/contacts/' + state.sourceId + '/conversations/' + state.conversationId + '/messages');
                    if (response.ok) {
                        const messages = await response.json();
                        renderMessages(messages);
                    }
                } catch (error) {}
            }
            function connectWebSocket() {
                if (!state.pubsubToken) return;
                if (state.websocket && state.websocket.readyState === WebSocket.OPEN) return;
                try {
                    state.websocket = new WebSocket(websocketUrl);
                    state.websocket.onopen = function() {
                        state.isConnected = true;
                        state.reconnectAttempts = 0;
                        state.websocket.send(JSON.stringify({
                            command: 'subscribe',
                            identifier: JSON.stringify({ channel: 'RoomChannel', pubsub_token: state.pubsubToken })
                        }));
                    };
                    state.websocket.onmessage = handleWebSocketMessage;
                    state.websocket.onclose = function() {
                        state.isConnected = false;
                        handleWebSocketReconnect();
                    };
                    state.websocket.onerror = function() {
                        state.isConnected = false;
                    };
                } catch (error) {}
            }
            function handleWebSocketMessage(event) {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'ping' || data.type === 'confirm_subscription') return;
                    if (data.message) {
                        const message = data.message;
                        if (message.conversation_id == state.conversationId || (message.conversation && message.conversation.id == state.conversationId)) {
                            const isAgentMessage = message.message_type === 1 || message.message_type === 'outgoing' || message.sender_type === 'AgentBot' || (message.sender_type === 'User' && message.sender && message.sender.type === 'agent_bot');
                            if (isAgentMessage && message.content) {
                                if (message.id && state.messageIds.has(message.id)) return;
                                if (message.id) state.messageIds.add(message.id);
                                hideTypingIndicator();
                                addMessageToUI(message.content, 'agent', true);
                            }
                            if (message.event === 'typing_on') showTypingIndicator();
                            else if (message.event === 'typing_off') hideTypingIndicator();
                        }
                    }
                } catch (error) {}
            }
            function handleWebSocketReconnect() {
                if (state.reconnectAttempts >= state.maxReconnectAttempts) {
                    return;
                }
                state.reconnectAttempts++;
                setTimeout(connectWebSocket, 3000);
            }
            function startPolling() {
                if (state.pollingIntervalId) return;
                state.pollingIntervalId = setInterval(pollMessages, state.pollingInterval);
            }
            function stopPolling() {
                if (state.pollingIntervalId) {
                    clearInterval(state.pollingIntervalId);
                    state.pollingIntervalId = null;
                }
            }
            async function pollMessages() {
                if (!state.conversationId || !state.sourceId) return;
                try {
                    const response = await fetch(config.baseUrl + '/public/api/v1/inboxes/' + config.inboxToken + '/contacts/' + state.sourceId + '/conversations/' + state.conversationId + '/messages');
                    if (response.ok) {
                        const messages = await response.json();
                        messages.forEach(function(msg) {
                            if (!msg.content) return;
                            if (msg.id && state.messageIds.has(msg.id)) return;
                            if (msg.message_type === 1) {
                                state.messageIds.add(msg.id);
                                hideTypingIndicator();
                                addMessageToUI(msg.content, 'agent', true);
                            }
                        });
                    }
                } catch (error) {}
            }
            function showTypingIndicator() {
                typingIndicator.classList.add('show');
                scrollToBottom();
            }
            function hideTypingIndicator() {
                typingIndicator.classList.remove('show');
            }
            function scrollToBottom() {
                const isMobile = window.innerWidth <= 768 || (window.visualViewport && window.visualViewport.width <= 768);
                const delay = isMobile ? 300 : 100;
                setTimeout(function() {
                    if (isMobile) {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    } else {
                        const messages = messagesContainer.querySelectorAll('.message-wrapper');
                        const lastMessage = messages[messages.length - 1];

                        if (lastMessage) {
                            lastMessage.scrollIntoView({
                                behavior: 'auto',
                                block: 'end',
                                inline: 'nearest'
                            });
                        } else {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    }
                }, delay);
            }
            function scrollToMessage(element) {
                setTimeout(function() {
                    if (element && messagesContainer) {
                        // Find the preceding user message to keep it visible
                        var target = element;
                        var prev = element.previousElementSibling;
                        while (prev) {
                            if (prev.classList.contains('user-message')) {
                                target = prev;
                                break;
                            }
                            prev = prev.previousElementSibling;
                        }

                        // Check if the AGENT message (element) is fully visible
                        var containerRect = messagesContainer.getBoundingClientRect();
                        var elementRect = element.getBoundingClientRect();
                        var agentFullyVisible = elementRect.bottom <= containerRect.bottom;

                        if (!agentFullyVisible) {
                            // Agent response extends below fold — scroll user question to top
                            var isMobile = window.innerWidth <= 768 || (window.visualViewport && window.visualViewport.width <= 768);
                            if (isMobile) {
                                var targetRect = target.getBoundingClientRect();
                                var offset = targetRect.top - containerRect.top;
                                messagesContainer.scrollTop = messagesContainer.scrollTop + offset - 20;
                            } else {
                                target.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start',
                                    inline: 'nearest'
                                });
                            }
                        }
                    }
                }, 100);
            }
            function renderMessages(messages) {
                const sorted = messages.sort(function(a, b) { return a.created_at - b.created_at; });
                messagesContainer.innerHTML = '';
                state.messageIds.clear();
                sorted.forEach(function(msg) {
                    if (!msg.content) return;
                    if (msg.id) state.messageIds.add(msg.id);
                    addMessageToUI(msg.content, msg.message_type === 0 ? 'user' : 'agent', false);
                });
                scrollToBottom();
            }
            function parseMarkdown(text) {
                if (!text) return '';
                const normalized = text.replace(/\\\\n/g, '\\n').replace(/\\\\r\\\\n/g, '\\n').replace(/\\\\r/g, '\\n');
                let html = normalized;
                const links = [];
                html = html.replace(/\\[([^\\]]+?)\\]\\(([^)]+?)\\)/g, function(_, t, url) {
                    const i = links.length;
                    links.push({ text: t, url: url });
                    return '%%LINK' + i + '%%';
                });
                html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                links.forEach(function(link, i) {
                    const safeUrl = link.url.replace(/"/g, '&quot;');
                    const safeText = link.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    html = html.replace('%%LINK' + i + '%%', '<a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">' + safeText + '</a>');
                });
                function applyInlineFormatting(text) {
                    return text
                        .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
                        .replace(/__(.+?)__/g, '<strong>$1</strong>')
                        .replace(/\\*([^*]+?)\\*/g, '<em>$1</em>')
                        .replace(/_([^_]+?)_/g, '<em>$1</em>')
                        .replace(/\`([^\`]+?)\`/g, '<code>$1</code>');
                }
                const lines = html.split('\\n');
                let result = [];
                let listType = null;
                let listItems = [];
                function flushList() {
                    if (listItems.length > 0) {
                        const tag = listType === 'ol' ? 'ol' : 'ul';
                        result.push('<' + tag + '>' + listItems.join('') + '</' + tag + '>');
                        listItems = [];
                        listType = null;
                    }
                }
                lines.forEach(function(line, index) {
                    const trimmed = line.trim();
                    const ulMatch = trimmed.match(/^[-*]\\s+(.+)$/);
                    const olMatch = trimmed.match(/^\\d+\\.\\s+(.+)$/);
                    if (ulMatch) {
                        if (listType !== 'ul') flushList();
                        listType = 'ul';
                        listItems.push('<li>' + applyInlineFormatting(ulMatch[1]) + '</li>');
                    } else if (olMatch) {
                        if (listType !== 'ol') flushList();
                        listType = 'ol';
                        listItems.push('<li>' + applyInlineFormatting(olMatch[1]) + '</li>');
                    } else {
                        flushList();
                        if (trimmed) result.push('<p>' + applyInlineFormatting(trimmed) + '</p>');
                        else if (index < lines.length - 1) result.push('<p></p>');
                    }
                });
                flushList();
                return result.join('');
            }
            function addMessageToUI(content, type, animate) {
                const wrapper = document.createElement('div');
                wrapper.className = 'message-wrapper' + (type === 'user' ? ' user-message' : '') + (animate ? ' animate' : '');
                const textDiv = document.createElement('div');
                textDiv.className = 'message-text';
                if (type === 'agent') {
                    textDiv.innerHTML = parseMarkdown(content);
                } else {
                    textDiv.innerHTML = '<p>' + content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
                }
                wrapper.appendChild(textDiv);
                messagesContainer.appendChild(wrapper);

                if (type === 'agent' && animate) {
                    scrollToMessage(wrapper);
                } else if (type !== 'user') {
                    if (animate) scrollToMessage(wrapper);
                }
            }
            async function handleSend() {
                const content = chatInput.value.trim();
                if (!content) return;
                const isMobile = window.innerWidth <= 768 || (window.visualViewport && window.visualViewport.width <= 768);

                chatInput.disabled = true;
                sendBtn.disabled = true;

                addMessageToUI(content, 'user', true);
                chatInput.value = '';

                if (isMobile) {
                    setTimeout(function() {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        setTimeout(function() {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }, 300);
                    }, 400);
                } else {
                    scrollToBottom();
                }

                await sendMessage(content);
                chatInput.disabled = false;
                sendBtn.disabled = false;

                if (!isMobile) {
                    chatInput.focus();
                }
            }
            function closeModal() {
                modalOverlay.classList.remove('active');
                stopPolling();
                setTimeout(function() {
                    window.parent.postMessage({ type: 'effectgroep-collapse' }, '*');
                }, 500);
            }
            closeBtn.addEventListener('click', closeModal);
            modalBackground.addEventListener('click', closeModal);
            sendBtn.addEventListener('pointerdown', function(e) {
                e.preventDefault();
                if (!sendBtn.disabled) {
                    handleSend();
                }
            });
            sendBtn.addEventListener('click', function(e) {
                if (!e.detail || e.detail === 0) {
                    handleSend();
                }
            });
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                }
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') closeModal();
            });
            window.addEventListener('message', async function(event) {
                if (event.data.type === 'effectgroep-init-modal') {
                    loadSession();
                    modalOverlay.style.display = 'flex';
                    modalOverlay.offsetHeight;
                    modalOverlay.classList.add('active');
                    const hasValidSession = await validateAndRestoreSession();
                    if (event.data.message) {
                        addMessageToUI(event.data.message, 'user', true);
                        await sendMessage(event.data.message);
                    }
                    if (state.pubsubToken) {
                        connectWebSocket();
                    }
                    startPolling();
                    chatInput.focus();
                }
            });
        })();
    <\/script>
</body>
</html>`;
        }
    };
    window.EffectgroepChatCombined = EffectgroepChatCombinedLoader;
    EffectgroepChatCombined.init();
})(window, document);