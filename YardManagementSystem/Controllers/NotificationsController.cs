using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using YardManagementSystem.Data;
using YardManagementSystem.DTOs;

namespace YardManagementSystem.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public NotificationsController(ApplicationDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int skip = 0, [FromQuery] int take = 20)
        {
            if (skip < 0) skip = 0;
            if (take < 1) take = 20;
            if (take > 100) take = 100;

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var q = _db.UserNotifications
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAtUtc);

            var total = await q.CountAsync();
            var unread = await _db.UserNotifications
                .AsNoTracking()
                .CountAsync(x => x.UserId == userId && !x.IsRead);

            var items = await q.Skip(skip).Take(take)
                .Select(x => new NotificationItemDto
                {
                    Id = x.Id,
                    Type = x.Type,
                    Title = x.Title,
                    Message = x.Message,
                    EntityId = x.EntityId,
                    IsRead = x.IsRead,
                    CreatedAtUtc = x.CreatedAtUtc
                })
                .ToListAsync();

            return Ok(new { total, unread, items });
        }

        [HttpPost("{id:guid}/read")]
        public async Task<IActionResult> MarkRead(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var row = await _db.UserNotifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
            if (row == null) return NotFound();

            if (!row.IsRead)
            {
                row.IsRead = true;
                row.ReadAtUtc = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            return Ok(new { message = "Marked as read" });
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var rows = await _db.UserNotifications
                .Where(x => x.UserId == userId && !x.IsRead)
                .ToListAsync();

            if (rows.Count == 0) return Ok(new { message = "No unread notifications" });

            var now = DateTime.UtcNow;
            foreach (var r in rows)
            {
                r.IsRead = true;
                r.ReadAtUtc = now;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "All notifications marked as read" });
        }
    }
}
