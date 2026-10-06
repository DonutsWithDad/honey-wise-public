/**
 * Client-side mirrors of the HoneyWise API grid view contracts (see
 * HoneyWise.Api Contracts/GridView.cs). `state` is opaque to the API; each page
 * decides what it holds.
 */

/** A named, saved grid layout returned by GET /GridViews. */
export interface GridView<TState = unknown> {
  id: string;
  /** Which grid the view belongs to, e.g. "recipes". */
  gridKey: string;
  name: string;
  state: TState;
  /** True for the view the grid opens with. At most one per grid. */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload for POST /GridViews and PUT /GridViews/{id}. */
export interface GridViewInput<TState = unknown> {
  gridKey: string;
  name: string;
  state: TState;
  isDefault: boolean;
}
