using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MiniPolls.Application.Interfaces;
using MiniPolls.Application.Polls.Services;
using MiniPolls.Infrastructure.Persistence;
using MiniPolls.Infrastructure.Persistence.Repositories;

namespace MiniPolls.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? "Data Source=data/minipolls.db";

        services.AddDbContext<MiniPollsDbContext>(options =>
            options.UseSqlite(connectionString));

        services.AddScoped<IPollRepository, PollRepository>();
        services.AddScoped<IVoteRepository, VoteRepository>();

        services.Configure<SlugGenerationOptions>(opts =>
        {
            if (int.TryParse(configuration["SlugGeneration:Length"], out var length) && length > 0)
                opts.Length = length;
        });

        return services;
    }
}
