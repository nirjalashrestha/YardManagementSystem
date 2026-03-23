using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class YardCheck
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(10)]
        public string Date { get; set; } = ""; // yyyy-MM-dd

        [Required, MaxLength(5)]
        public string Time { get; set; } = ""; // HH:mm

        [Required, MaxLength(60)]
        public string TrailerNumber { get; set; } = "";

        [Required]
        public Guid FacilityId { get; set; }

        [Required]
        public Guid LocationId { get; set; }

        [Required, MaxLength(30)]
        public string Status { get; set; } = "Pending";

        [MaxLength(160)]
        public string? CreatedBy { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; }

        [ForeignKey(nameof(LocationId))]
        public Location? Location { get; set; }
    }
}
