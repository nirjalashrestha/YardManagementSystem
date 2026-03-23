using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class InspectionUpsertDto
    {
        [Required] public string Date { get; set; } = "";   // yyyy-MM-dd
        [Required] public string Time { get; set; } = "";   // HH:mm

        [Required] public Guid CarrierId { get; set; }
        [Required] public string TrailerNumber { get; set; } = "";

        [Required] public Guid FacilityId { get; set; }
        [Required] public Guid LocationId { get; set; }

        [Required] public string Issue { get; set; } = "";
        [Required] public string Area { get; set; } = "";

        [Required] public string Status { get; set; } = "Pending";
        public string? Remarks { get; set; }
    }

    public class InspectionListItemDto
    {
        public int Id { get; set; }

        public string Date { get; set; } = "";
        public string Time { get; set; } = "";

        public Guid CarrierId { get; set; }
        public string CarrierName { get; set; } = "";

        public string TrailerNumber { get; set; } = "";

        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";

        public Guid LocationId { get; set; }
        public string LocationName { get; set; } = "";

        public string Issue { get; set; } = "";
        public string Area { get; set; } = "";

        public string Status { get; set; } = "";
        public string? Remarks { get; set; }
    }
    public class InspectionPagedResponseDto
    {
        public int Total { get; set; }
        public int Shown { get; set; }
        public List<InspectionListItemDto> Items { get; set; } = new();
    }
}