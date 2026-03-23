using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class LocationItemDto
    {
        public Guid Id { get; set; }
        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";
        public string LocationName { get; set; } = "";
        public string LocationType { get; set; } = "";
        public string LocationCode { get; set; } = "";
        public int? Capacity { get; set; }
        public int SortOrder { get; set; }
    }

    public class LocationCreateUpdateDto
    {
        [Required]
        public Guid FacilityId { get; set; }

        [Required, MaxLength(120)]
        public string LocationName { get; set; } = "";

        [Required, MaxLength(20)]
        public string LocationType { get; set; } = "GATE"; // GATE, DOCK, PARKING, INSPECTION

        [Required, MaxLength(20)]
        public string LocationCode { get; set; } = "";

        public int? Capacity { get; set; }

        public int SortOrder { get; set; } = 1;
    }
}
