export const ErrorAlert = ({error}: { error: string | null }) => (
    error ? (
        <div className="panel alert alert-error mt16">
            {error}
        </div>
    ) : null
);