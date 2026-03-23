namespace YardManagementSystem.DTOs
{
    public class NotificationItemDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = "";
        public string Title { get; set; } = "";
        public string Message { get; set; } = "";
        public string? EntityId { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAtUtc { get; set; }
    }
}
