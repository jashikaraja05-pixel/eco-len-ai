<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The local account/session/history store validates persisted values before exposing them to the UI, because malformed browser storage must not crash the application.
- The Google-labelled primary-account entry is an explicitly requested browser-only shortcut, not OAuth; never represent it as verified identity or production-secure authentication.
