using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using MiniPolls.Domain.Exceptions;
using System.Net;

namespace MiniPolls.Api.Middleware;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException ex)
        {
            logger.LogWarning("Validation failed: {Errors}", ex.Message);
            await WriteValidationProblem(context, ex);
        }
        catch (DomainException ex)
        {
            logger.LogWarning("Domain rule violated: {Message}", ex.Message);
            await WriteDomainError(context, ex);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception");
            await WriteServerError(context, ex);
        }
    }

    private static async Task WriteValidationProblem(HttpContext context, ValidationException ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
        context.Response.ContentType = "application/problem+json";

        var errors = ex.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => g.Select(e => e.ErrorMessage).ToArray());

        var problem = new ValidationProblemDetails(errors)
        {
            Status = (int)HttpStatusCode.BadRequest,
            Title = "Validation failed",
            Type = "https://tools.ietf.org/html/rfc7807"
        };

        await context.Response.WriteAsJsonAsync(problem);
    }

    private static async Task WriteDomainError(HttpContext context, DomainException ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = (int)HttpStatusCode.BadRequest,
            Title = "Domain rule violated",
            Type = "https://tools.ietf.org/html/rfc7807",
            Detail = ex.Message
        };

        await context.Response.WriteAsJsonAsync(problem);
    }

    private static async Task WriteServerError(HttpContext context, Exception ex)
    {
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
        context.Response.ContentType = "application/problem+json";

        var problem = new ProblemDetails
        {
            Status = (int)HttpStatusCode.InternalServerError,
            Title = "An unexpected error occurred",
            Type = "https://tools.ietf.org/html/rfc7807",
            Detail = ex.Message
        };

        await context.Response.WriteAsJsonAsync(problem);
    }
}
