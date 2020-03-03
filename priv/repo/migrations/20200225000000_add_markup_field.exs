defmodule Ellie.Repo.Migrations.CreateRedirects do
  use Ecto.Migration

  def up do
    alter table(:revisions) do
      add :markup_code, :text, null: false, default: ""
    end
  end

  def down do
    alter table(:revisions) do
      remove :markup_code
    end
  end
end
