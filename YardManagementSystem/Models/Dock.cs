using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class Dock
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid FacilityId { get; set; }

        public Guid? LocationId { get; set; }

        [Required, MaxLength(80)]
        public string DockName { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string DockType { get; set; } = "BOTH"; // INBOUND, OUTBOUND, BOTH

        [Required, MaxLength(20)]
        public string Status { get; set; } = "AVAILABLE"; // AVAILABLE, OCCUPIED, MAINTENANCE, BLOCKED

        public int SortOrder { get; set; } = 1;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; } // optional concurrency check

        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; }

        [ForeignKey(nameof(LocationId))]
        public Location? Location { get; set; }

        public ICollection<DockAssignment> DockAssignments { get; set; } = new List<DockAssignment>();
    }
}
