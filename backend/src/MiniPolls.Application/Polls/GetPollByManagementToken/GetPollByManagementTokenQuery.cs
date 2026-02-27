using MediatR;

namespace MiniPolls.Application.Polls.GetPollByManagementToken;

public sealed record GetPollByManagementTokenQuery(string Token) : IRequest<ManagementPollDto?>;