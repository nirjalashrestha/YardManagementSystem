using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Data;
using YardManagementSystem.Models;

namespace YardManagementSystem.Services
{
    public class NotificationService
    {
        private readonly ApplicationDbContext _db;
        private readonly UserManager<ApplicationUsers> _userManager;

        public NotificationService(
            ApplicationDbContext db,
            UserManager<ApplicationUsers> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        public Task NotifyArrivalEnteredAsync(Arrival a)
        {
            var title = "Arrival Entered";
            var message = $"Arrival {a.ActivityId} ({a.TrailerNumber}) entered at {a.GateNo}.";
            return NotifyUsersAsync(
                type: "arrival_entered",
                title: title,
                message: message,
                entityId: a.ActivityId,
                wantArrival: true,
                wantDeparture: false);
        }

        public Task NotifyDepartureExitedAsync(Departure d)
        {
            var title = "Departure Exited";
            var message = $"Departure {d.ActivityId} ({d.TrailerNumber}) exited at {d.ExitGateNo}.";
            return NotifyUsersAsync(
                type: "departure_exited",
                title: title,
                message: message,
                entityId: d.ActivityId,
                wantArrival: false,
                wantDeparture: true);
        }

        private async Task NotifyUsersAsync(
            string type,
            string title,
            string message,
            string? entityId,
            bool wantArrival,
            bool wantDeparture)
        {
            var users = await _userManager.Users
                .Where(u =>
                    (wantArrival && u.NotifyArrivals) ||
                    (wantDeparture && u.NotifyDepartures))
                .ToListAsync();

            if (users.Count == 0) return;

            var rows = new List<UserNotification>(users.Count);

            foreach (var u in users)
            {
                rows.Add(new UserNotification
                {
                    UserId = u.Id,
                    Type = type,
                    Title = title,
                    Message = message,
                    EntityId = entityId,
                    IsRead = false,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }

            _db.UserNotifications.AddRange(rows);
            await _db.SaveChangesAsync();
        }
    }
}
