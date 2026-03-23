using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class YardCheckCreateUpdateDto
    {
        [Required] public string Date { get; set; } = "";
        [Required] public string Time { get; set; } = "";
        [Required] public string TrailerNumber { get; set; } = "";
        [Required] public Guid FacilityId { get; set; }
        public Guid? LocationId { get; set; } // auto-track from latest arrival if null
        [Required] public string Status { get; set; } = "Pending";
    }

    public class YardCheckItemDto
    {
        public Guid Id { get; set; }
        public string Date { get; set; } = "";
        public string Time { get; set; } = "";
        public string TrailerNumber { get; set; } = "";

        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = "";

        public Guid? LocationId { get; set; }
        public string? LocationName { get; set; }

        public string Status { get; set; } = "";
        public string? CreatedBy { get; set; }

        public DateTime CreatedAtUtc { get; set; }
        public DateTime UpdatedAtUtc { get; set; }
    }
}
