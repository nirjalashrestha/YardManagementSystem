using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Dtos
{
    public class DriverPhotoUploadDto
    {
        [Required]
        public IFormFile File { get; set; } = default!;
    }
}