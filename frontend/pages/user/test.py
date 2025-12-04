from openai import OpenAI

# Hardcode your Hugging Face token here
HF_TOKEN = "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"

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN,
)

# Example chat message
completion = client.chat.completions.create(
    model="SentientAGI/Dobby-Unhinged-Llama-3.3-70B:fireworks-ai",
    messages=[
        {
            "role": "user",
            "content": "Tell me a fun fact about cats."
        }
    ],
)

# Print the response
print(completion.choices[0].message["content"])
