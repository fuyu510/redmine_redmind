module RedmineRedmind
  module Registry
    module_function

    def table
      @table ||= build_table.freeze
    end

    def supported_type?(object_type)
      table.key?(object_type.to_s)
    end

    def entry_for(object)
      return nil unless object
      table[object.class.name]
    end

    def field_for(object)
      entry = entry_for(object)
      entry && entry[:field]
    end

    def version_for(object)
      entry = entry_for(object)
      return nil unless entry && entry[:version]
      entry[:version].call(object)
    end

    # Only constantize names present in the frozen allowlist; never constantize
    # raw client input. This is the guard against object-type spoofing.
    def load_object(object_type, object_id)
      return nil unless supported_type?(object_type)
      object_type.to_s.constantize.find_by(id: object_id)
    rescue NameError, ActiveRecord::RecordNotFound
      nil
    end

    def editable?(object, user)
      entry = entry_for(object)
      return false unless entry && user
      return false unless object.respond_to?(:id) && object.id.present?
      return false unless entry[:accessible].call(object, user)
      entry[:editable].call(object, user)
    rescue StandardError
      false
    end

    def persist(object, new_text, user)
      entry = entry_for(object)
      return false unless entry
      entry[:persist].call(object, new_text, user)
    end

    def wiki_project(object)
      page = object.respond_to?(:page) ? object.page : nil
      wiki = page && page.wiki
      wiki && wiki.project
    end

    def build_table
      {
        'WikiContent' => {
          field: :text,
          version: ->(o) { o.respond_to?(:version) ? o.version : nil },
          accessible: lambda do |o, u|
            project = wiki_project(o)
            project && project.visible?(u) && project.module_enabled?(:wiki)
          end,
          editable: lambda do |o, u|
            project = wiki_project(o)
            project &&
              u.allowed_to?(:edit_wiki_pages, project) &&
              o.page.editable_by?(u)
          end,
          persist: lambda do |o, text, u|
            o.text = text
            o.author = u
            o.comments = I18n.t(:text_mindmap_edit_comment, default: 'Edited via mindmap')
            o.save
          end
        },

        'Issue' => {
          field: :description,
          version: ->(o) { o.respond_to?(:lock_version) ? o.lock_version : nil },
          accessible: ->(o, u) { o.visible?(u) },
          editable: lambda do |o, u|
            attributes_editable =
              o.respond_to?(:attributes_editable?) ? o.attributes_editable?(u) : o.editable?(u)
            field_unlocked =
              !o.respond_to?(:safe_attribute?) || o.safe_attribute?('description', u)
            attributes_editable && field_unlocked
          end,
          persist: lambda do |o, text, u|
            o.init_journal(u)
            o.description = text
            o.save
          end
        },

        'Journal' => {
          field: :notes,
          version: ->(_o) { nil },
          accessible: lambda do |o, u|
            journalized = o.journalized
            next false unless journalized && journalized.visible?(u)
            !o.private_notes? || u.allowed_to?(:view_private_notes, journalized.project)
          end,
          editable: ->(o, u) { o.editable_by?(u) },
          persist: lambda do |o, text, _u|
            o.notes = text
            o.save
          end
        }
      }
    end
  end
end
