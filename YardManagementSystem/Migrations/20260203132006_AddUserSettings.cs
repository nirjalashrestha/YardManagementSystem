using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YardManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddUserSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Carriers_CarrierCode",
                table: "Carriers");

            migrationBuilder.DropIndex(
                name: "IX_Carriers_FacilityId",
                table: "Carriers");

            migrationBuilder.AddColumn<bool>(
                name: "NotifyArrivals",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyDepartures",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyEmail",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "NotifySms",
                table: "AspNetUsers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ProfileImageUrl",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ThemePreference",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Carriers_FacilityId_CarrierCode",
                table: "Carriers",
                columns: new[] { "FacilityId", "CarrierCode" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Carriers_FacilityId_CarrierCode",
                table: "Carriers");

            migrationBuilder.DropColumn(
                name: "NotifyArrivals",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "NotifyDepartures",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "NotifyEmail",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "NotifySms",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ProfileImageUrl",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ThemePreference",
                table: "AspNetUsers");

            migrationBuilder.CreateIndex(
                name: "IX_Carriers_CarrierCode",
                table: "Carriers",
                column: "CarrierCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Carriers_FacilityId",
                table: "Carriers",
                column: "FacilityId");
        }
    }
}
