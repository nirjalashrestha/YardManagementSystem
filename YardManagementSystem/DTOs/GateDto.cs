using System;
using System.ComponentModel.DataAnnotations;


namespace YardManagementSystem.Dtos
{
    public class GateCreateUpdateDto
    {
        [Required]
        public Guid FacilityId { get; set; }


        [Required, MaxLength(80)]
        public string GateName { get; set; } = "";


        [Required, MaxLength(10)]
        public string GateType { get; set; } = "BOTH"; // ENTRY, EXIT, BOTH


        [Required, MaxLength(10)]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE

        public int SortOrder { get; set; } = 1;
    }


    public class GateItemDto
    {
        public Guid Id { get; set; }
        public Guid FacilityId { get; set; }
        public string FacilityName { get; set; } = ""; public string GateName { get; set; } = ""; public string GateType { get; set; } = ""; public string Status { get; set; } = "";
        public int SortOrder { get; set; }
    }
}