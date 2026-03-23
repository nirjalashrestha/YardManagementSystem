using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class DockCreateUpdateDto
    {
        [Required]
        public Guid FacilityId { get; set; }

        public Guid? LocationId { get; set; } // optional

        [Required, MaxLength(80)]
        public string DockName { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string DockType { get; set; } = "BOTH"; // INBOUND, OUTBOUND, BOTH

        [Required, MaxLength(20)]
        public string Status { get; set; } = "AVAILABLE"; // AVAILABLE, MAINTENANCE, BLOCKED, OCCUPIED

        public int SortOrder { get; set; } = 1;
    }

    public class DockItemDto
    {
        public Guid Id { get; set; }
        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = string.Empty;
        public Guid? LocationId { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public string DockName { get; set; } = string.Empty;
        public string DockType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public bool IsOccupied => string.Equals(Status, "OCCUPIED", StringComparison.OrdinalIgnoreCase);
    }
}
