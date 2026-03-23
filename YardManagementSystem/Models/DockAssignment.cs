using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class DockAssignment
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid DockId { get; set; }

        [Required]
        public Guid ArrivalId { get; set; }

        [Required]
        public DateTime DockInAt { get; set; } = DateTime.UtcNow;

        public DateTime? DockOutAt { get; set; }

        [Required]
        public bool IsActive { get; set; } = true; // true while occupied

        [Required, MaxLength(20)]
        public string Status { get; set; } = "OCCUPIED"; // OCCUPIED, COMPLETED, DELAYED, DAMAGED

        [MaxLength(20)]
        public string? FinalStatus { get; set; } // COMPLETED, DELAYED, DAMAGED

        [MaxLength(300)]
        public string? Notes { get; set; }

        [MaxLength(100)]
        public string? CreatedBy { get; set; }

        [MaxLength(100)]
        public string? ReleasedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReleasedAt { get; set; }

        [ForeignKey(nameof(DockId))]
        public Dock? Dock { get; set; }

        [ForeignKey(nameof(ArrivalId))]
        public Arrival? Arrival { get; set; }
    }
}
