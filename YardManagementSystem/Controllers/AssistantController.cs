using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YardManagementSystem.Services;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/assistant")]
    [Authorize]
    public class AssistantController : ControllerBase
    {
        private readonly AiAssistantService _ai;
        public AssistantController(AiAssistantService ai) => _ai = ai;

        public class AskDto { public string Message { get; set; } = ""; }

        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] AskDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest("Message is required.");

            var reply = await _ai.AskAsync(dto.Message.Trim());
            return Ok(new { reply });
        }
    }
}
