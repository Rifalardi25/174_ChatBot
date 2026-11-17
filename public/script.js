const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const resetBtn = document.getElementById("reset-btn");
const quickPrompts = document.getElementById("quick-prompts");

let conversationHistory = [];
let isGenerating = false;

// Menyesuaikan tinggi textarea secara otomatis saat pengguna mengetik
userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = `${Math.min(userInput.scrollHeight, 130)}px`;
});

// Mengirim pesan dengan tombol Enter (Shift + Enter untuk baris baru)
userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

// Menangani klik pada tombol saran pertanyaan cepat
if (quickPrompts) {
    quickPrompts.addEventListener("click", (event) => {
        const chip = event.target.closest(".prompt-chip");
        if (!chip || isGenerating) return;

        userInput.value = chip.dataset.prompt;
        chatForm.requestSubmit();
    });
}

// Mereset percakapan ke kondisi awal
resetBtn.addEventListener("click", () => {
    if (isGenerating) return;

    conversationHistory = [];
    chatBox.innerHTML = `
        <div class="message-row bot">
            <div class="avatar bot-avatar" aria-hidden="true">AI</div>
            <div class="message-bubble">
                <div class="message-content">Halo! Ada yang bisa saya bantu hari ini?</div>
            </div>
        </div>
    `;
});

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function appendMessage(role, initialText = "") {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;

    const avatar = document.createElement("div");
    avatar.className = `avatar ${role}-avatar`;
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = role === "user" ? "Anda" : "AI";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    const content = document.createElement("div");
    content.className = "message-content";

    if (role === "bot" && !initialText) {
        content.innerHTML = `
            <div class="typing-indicator" aria-label="AI sedang mengetik">
                <span></span><span></span><span></span>
            </div>
        `;
    } else {
        content.textContent = initialText;
    }

    bubble.appendChild(content);
    row.appendChild(avatar);
    row.appendChild(bubble);
    chatBox.appendChild(row);
    scrollToBottom();

    return { bubble, content };
}

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const messageText = userInput.value.trim();
    if (!messageText || isGenerating) return;

    // Sembunyikan saran pertanyaan setelah percakapan dimulai
    if (quickPrompts) {
        quickPrompts.style.display = "none";
    }

    isGenerating = true;
    sendBtn.disabled = true;

    // Tampilkan pesan pengguna dan simpan ke riwayat
    appendMessage("user", messageText);
    conversationHistory.push({ role: "user", content: messageText });

    userInput.value = "";
    userInput.style.height = "auto";

    // Siapkan gelembung balasan AI dengan indikator mengetik
    const { bubble: botBubble, content: botContent } = appendMessage("bot");
    let fullBotReply = "";
    let isFirstChunk = true;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });

        if (!response.ok) {
            const errorResult = await response.json().catch(() => ({}));
            throw new Error(errorResult.error || `Gagal terhubung ke server (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop();

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith("data:")) {
                    continue;
                }

                const data = trimmedLine.slice(5).trim();
                if (data === "[DONE]") {
                    continue;
                }

                try {
                    const chunkText = JSON.parse(data);
                    if (chunkText) {
                        if (isFirstChunk) {
                            botContent.textContent = "";
                            isFirstChunk = false;
                        }
                        fullBotReply += chunkText;
                        botContent.textContent = fullBotReply;
                        scrollToBottom();
                    }
                } catch (parseError) {
                    console.error("Gagal memproses potongan stream:", parseError);
                }
            }
        }

        if (fullBotReply) {
            conversationHistory.push({ role: "assistant", content: fullBotReply });
        } else if (isFirstChunk) {
            botContent.textContent = "Tidak ada respons yang diterima dari model.";
        }
    } catch (error) {
        console.error("Chat Error:", error);
        botBubble.classList.add("error-bubble");
        botContent.textContent = `Terjadi kesalahan: ${error.message}`;
    } finally {
        isGenerating = false;
        sendBtn.disabled = false;
        userInput.focus();
        scrollToBottom();
    }
});