using System.Net;
using System.Net.Mail;

namespace YardManagementSystem.Services
{
    public class EmailSender
    {
        public async Task SendEmailAsync(string to, string subject, string body)
        {
            using var smtp = new SmtpClient("smtp.gmail.com", 587);
            smtp.EnableSsl = true;
            smtp.UseDefaultCredentials = false;
            smtp.Credentials = new NetworkCredential(
                "lightghar0@gmail.com",
                "cswuipfxytxfajhq"
            );

            using var mail = new MailMessage();
            mail.From = new MailAddress("lightghar0@gmail.com", "YardManagementSystem");
            mail.To.Add(to);
            mail.Subject = subject;
            mail.Body = body;

            await smtp.SendMailAsync(mail);
        }
    }
}