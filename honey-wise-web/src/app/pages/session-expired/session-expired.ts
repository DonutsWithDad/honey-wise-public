import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Shown when a session ends because the token expired (idle timeout or a token the
 * server rejected). Explains what happened and offers a route back to sign in.
 */
@Component({
  selector: 'app-session-expired',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './session-expired.html',
  styleUrl: './session-expired.scss',
})
export class SessionExpired {}
