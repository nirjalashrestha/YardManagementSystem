using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YardManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class UpdateVehicleTrailerFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_AspNetUsers_DriverUserId",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_DriverUserId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "DriverUserId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "OwnerCompany",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "PlateNumber",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "Vehicles");

            migrationBuilder.RenameColumn(
                name: "VehicleId",
                table: "Vehicles",
                newName: "VehicleNumber");

            migrationBuilder.RenameColumn(
                name: "CreatedAtUtc",
                table: "Vehicles",
                newName: "CreatedAt");

            migrationBuilder.RenameIndex(
                name: "IX_Vehicles_VehicleId",
                table: "Vehicles",
                newName: "IX_Vehicles_VehicleNumber");

            migrationBuilder.AlterColumn<string>(
                name: "VehicleType",
                table: "Vehicles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "PhotoUrl",
                table: "Vehicles",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(300)",
                oldMaxLength: 300,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Notes",
                table: "Vehicles",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(300)",
                oldMaxLength: 300,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "Vehicles",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "CarrierName",
                table: "Vehicles",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DriverRefId",
                table: "Vehicles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrailerNumber",
                table: "Vehicles",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CarrierName",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "DriverRefId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "TrailerNumber",
                table: "Vehicles");

            migrationBuilder.RenameColumn(
                name: "VehicleNumber",
                table: "Vehicles",
                newName: "VehicleId");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "Vehicles",
                newName: "CreatedAtUtc");

            migrationBuilder.RenameIndex(
                name: "IX_Vehicles_VehicleNumber",
                table: "Vehicles",
                newName: "IX_Vehicles_VehicleId");

            migrationBuilder.AlterColumn<string>(
                name: "VehicleType",
                table: "Vehicles",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "PhotoUrl",
                table: "Vehicles",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Notes",
                table: "Vehicles",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "Vehicles",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<string>(
                name: "DriverUserId",
                table: "Vehicles",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OwnerCompany",
                table: "Vehicles",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PlateNumber",
                table: "Vehicles",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "Vehicles",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_DriverUserId",
                table: "Vehicles",
                column: "DriverUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_AspNetUsers_DriverUserId",
                table: "Vehicles",
                column: "DriverUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
