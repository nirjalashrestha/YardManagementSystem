using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class FacilityCreateUpdateDto
    {
        [Required, MaxLength(120)]
        public string FacilityName { get; set; } = "";

        [Required, MaxLength(20)]
        public string FacilityCode { get; set; } = "";

        [Required, MaxLength(50)]
        public string Type { get; set; } = "";
    }

    public class FacilityItemDto
    {
        public Guid Id { get; set; }
        public string FacilityName { get; set; } = "";
        public string FacilityCode { get; set; } = "";
        public string Type { get; set; } = "";
    }

    public class PagedResult<T>
    {
        public int Total { get; set; }
        public int Shown { get; set; }
        public T[] Items { get; set; } = Array.Empty<T>();
    }


}