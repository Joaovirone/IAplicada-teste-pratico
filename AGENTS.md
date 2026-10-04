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

- Keep the external product catalog integration isolated in a browser-safe client module because it uses a separate public backend connection.
- Keep primary application navigation in the shared root shell so every route has the same collapsible sidebar.
- Keep order status transition rules in the shared order-status module and validate persisted status before every update, because multiple screens advance the same workflow.
