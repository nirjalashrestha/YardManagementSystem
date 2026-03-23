using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace YardManagementSystem.Services
{
    public class AiAssistantService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;

        public AiAssistantService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _config = config;
        }

        public async Task<string> AskAsync(string userMessage)
        {
            var apiKey = _config["OpenAI:ApiKey"];
            var model = _config["OpenAI:Model"] ?? "gpt-4o-mini";

            if (string.IsNullOrWhiteSpace(apiKey))
                return "Assistant is not configured yet (missing OpenAI key).";

            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", apiKey);

            var body = new
            {
                model,
                messages = new object[]
                {
                    new { role = "system", content = "You are YMS assistant. Give short, practical answers for yard operations." },
                    new { role = "user", content = userMessage }
                },
                temperature = 0.3
            };

            var json = JsonSerializer.Serialize(body);
            using var res = await _http.PostAsync(
                "https://api.openai.com/v1/chat/completions",
                new StringContent(json, Encoding.UTF8, "application/json"));

            var text = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode) return "Assistant error: " + res.StatusCode;

            using var doc = JsonDocument.Parse(text);
            return doc.RootElement
                      .GetProperty("choices")[0]
                      .GetProperty("message")
                      .GetProperty("content")
                      .GetString() ?? "No reply.";
        }
    }
}
