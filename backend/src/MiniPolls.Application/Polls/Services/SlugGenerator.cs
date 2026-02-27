using System.Security.Cryptography;

namespace MiniPolls.Application.Polls.Services;

public static class SlugGenerator
{
    private const string Alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public static string GenerateSlug(int length)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(length, 1);

        return new string(Enumerable
            .Range(0, length)
            .Select(_ => Alphabet[Random.Shared.Next(Alphabet.Length)])
            .ToArray());
    }

    public static string GenerateManagementToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}
