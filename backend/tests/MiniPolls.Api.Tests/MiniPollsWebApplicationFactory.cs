using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MiniPolls.Infrastructure.Persistence;

namespace MiniPolls.Api.Tests;

public sealed class MiniPollsWebApplicationFactory : WebApplicationFactory<Program>, IAsyncDisposable
{
    private readonly SqliteConnection _connection;

    public MiniPollsWebApplicationFactory()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Use Development so Program.cs auto-applies migrations on startup
        builder.UseEnvironment("Development");

        builder.ConfigureServices(services =>
        {
            // Remove the existing DbContext options registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<MiniPollsDbContext>));

            if (descriptor is not null)
                services.Remove(descriptor);

            // Register a new DbContext using the shared in-memory SQLite connection
            services.AddDbContext<MiniPollsDbContext>(options =>
                options.UseSqlite(_connection));
        });
    }

    async ValueTask IAsyncDisposable.DisposeAsync()
    {
        await _connection.DisposeAsync();
        await base.DisposeAsync();
    }
}
