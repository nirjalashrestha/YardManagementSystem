using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class TrailerTypeCreateUpdateDto
    {
        [Required, MaxLength(240)]
        public string TrailerTypeName { get; set; } = "";

        [Required, MaxLength(40)]
        public string TrailerTypeCode { get; set; } = "";

        [Required]
        public Guid FacilityId { get; set; }

        public decimal? Length { get; set; }

        [Required, MaxLength(10)]
        public string Status { get; set; } = "ACTIVE";

        public int SortOrder { get; set; } = 1;
    }

    public class TrailerTypeItemDto
    {
        public Guid Id { get; set; }
        public string TrailerTypeName { get; set; } = "";
        public string TrailerTypeCode { get; set; } = "";
        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";
        public decimal? Length { get; set; }
        public string Status { get; set; } = "";
        public int SortOrder { get; set; }
    }
}