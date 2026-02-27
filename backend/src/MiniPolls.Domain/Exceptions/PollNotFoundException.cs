namespace MiniPolls.Domain.Exceptions;

public sealed class PollNotFoundException : DomainException
{
	private PollNotFoundException(string message) : base(message)
	{
	}

	public static PollNotFoundException ForSlug(string slug)
		=> new($"Poll with slug '{slug}' was not found.");

	public static PollNotFoundException ForManagementToken()
		=> new("Poll with the specified management token was not found.");
}
