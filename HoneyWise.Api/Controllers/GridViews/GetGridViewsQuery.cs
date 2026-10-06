using HoneyWise.Api.Store;
using HoneyWise.Contracts;
using MediatR;

namespace HoneyWise.Api.Controllers.GridViews;

/// <summary>
/// Lists the calling user's saved views for one grid.
/// </summary>
public class GetGridViewsQuery : IRequest<IReadOnlyList<GridView>>
{
    /// <summary>Owning user's id, resolved from the authenticated principal.</summary>
    public Guid UserId { get; set; }

    public string GridKey { get; set; } = string.Empty;
}

public class GetGridViewsQueryHandler : IRequestHandler<GetGridViewsQuery, IReadOnlyList<GridView>>
{
    private readonly IGridViewStore _gridViewStore;

    public GetGridViewsQueryHandler(IGridViewStore gridViewStore)
    {
        _gridViewStore = gridViewStore;
    }

    public Task<IReadOnlyList<GridView>> Handle(GetGridViewsQuery request, CancellationToken cancellationToken)
    {
        return _gridViewStore.GetViews(request.UserId, request.GridKey);
    }
}
