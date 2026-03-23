using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Models
{
    public class UserNotification
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(450)]
        public string UserId { get; set; } = "";

        [Required, MaxLength(60)]
        public string Type { get; set; } = "";

        [Required, MaxLength(120)]
        public string Title { get; set; } = "";

        [Required, MaxLength(500)]
        public string Message { get; set; } = "";

        [MaxLength(120)]
        public string? EntityId { get; set; }

        public bool IsRead { get; set; } = false;
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? ReadAtUtc { get; set; }
    }
}
