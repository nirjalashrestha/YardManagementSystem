using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using YardManagementSystem.DTOs;
using YardManagementSystem.Models;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/settings")]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly UserManager<ApplicationUsers> _userManager;

        public SettingsController(UserManager<ApplicationUsers> userManager)
        {
            _userManager = userManager;
        }

        // PUT /api/settings/preferences
        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var u = await _userManager.FindByIdAsync(userId);
            if (u == null) return NotFound("User not found.");

            var theme = (dto.ThemePreference ?? "dark").Trim().ToLower();
            if (theme != "light" && theme != "dark") theme = "dark";

            u.ThemePreference = theme;
            u.NotifyArrivals = dto.NotifyArrivals;
            u.NotifyDepartures = dto.NotifyDepartures;
            u.NotifyEmail = dto.NotifyEmail;
            u.NotifySms = dto.NotifySms;

            var res = await _userManager.UpdateAsync(u);
            if (!res.Succeeded) return BadRequest(res.Errors);

            return Ok(new { message = "Preferences updated" });
        }

        // POST /api/settings/ai-support
        [HttpPost("ai-support")]
        public IActionResult AiSupport([FromBody] AiSupportRequestDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var message = (dto.Message ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(message))
            {
                return Ok(new
                {
                    response = "Please type a question. I can help with arrivals, entry, dock assignment, yard map, reports, and common errors."
                });
            }

            return Ok(new
            {
                response = BuildSupportReply(message)
            });
        }

        private static string BuildSupportReply(string message)
        {
            if (ContainsAny(message, "create arrival", "add arrival", "arrival"))
                return "Go to Gate Activity > Arrivals > Add Arrival. Fill truck, trailer, driver, carrier, and facility details, then save.";

            if (ContainsAny(message, "create entry", "mark entry", "gate entry", "entry"))
                return "Open Gate Activity, select a Waiting arrival, then mark Entry at the correct gate. Only Entered trucks can be assigned to docks.";

            if (ContainsAny(message, "assign dock", "dock assign", "dock assignment", "dock"))
                return "Use Dock Management > Assign/Release Dock. Choose an Entered truck and an Available dock in the same facility/location, then confirm.";

            if (ContainsAny(message, "not in dock list", "truck not in dock list", "not showing in dock"))
                return "A truck appears in dock assignment only when arrival status is Entered and facility/location matches the selected dock.";

            if (ContainsAny(message, "yard map", "map", "slot status", "parking slot"))
                return "Open Yard Map to view dock and parking status. Apply facility/location filters to match operations.";

            if (ContainsAny(message, "yard move", "move truck", "shift truck"))
                return "Go to Yard Move, select source and destination location, verify truck status, and confirm the move.";

            if (ContainsAny(message, "yard check", "inspection", "checklist"))
                return "Use Yard Check or Inspection to log safety and condition checks. Complete required fields before submitting.";

            if (ContainsAny(message, "report", "kpi", "statistics"))
                return "Open Reports and apply date/facility filters to view arrivals, departures, dwell time, and utilization KPIs.";

            if (ContainsAny(message, "permission", "role", "access", "not authorized", "forbidden"))
                return "This action may be blocked by role permissions. Verify your role in Settings or ask Admin to grant access.";

            if (ContainsAny(message, "error", "failed", "invalid", "cannot save", "bad request"))
                return "Check required fields, status flow (Waiting > Entered > Assigned), and facility/location consistency. If it still fails, share the exact error text.";

            return "I can help with arrivals, entry, dock assignment, yard map, yard move/check, reports, role access, and validation errors. Ask a specific workflow question.";
        }

        private static bool ContainsAny(string source, params string[] terms)
        {
            foreach (var term in terms)
            {
                if (source.Contains(term, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }
    }
}
