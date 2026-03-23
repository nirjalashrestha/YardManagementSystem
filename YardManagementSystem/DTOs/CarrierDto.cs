using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class CarrierCreateUpdateDto
    {
        [Required, MaxLength(240)]
        public string CarrierName { get; set; } = "";

        [Required, MaxLength(40)]
        public string CarrierCode { get; set; } = "";

        [Required]
        public Guid FacilityId { get; set; }

        public int SortOrder { get; set; } = 1;
    }

    public class CarrierItemDto
    {
        public Guid Id { get; set; }
        public string CarrierName { get; set; } = "";
        public string CarrierCode { get; set; } = "";
        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";  // ✅ return name
        public int SortOrder { get; set; }
    }
}