module RedmineRedmind
  class Hooks < Redmine::Hook::ViewListener
    def view_layouts_base_html_head(_context = {})
      config_tag +
        stylesheet_link_tag('mind-elixir', plugin: 'redmine_redmind') +
        stylesheet_link_tag('redmine_redmind', plugin: 'redmine_redmind') +
        javascript_include_tag('mindmap_outline', plugin: 'redmine_redmind') +
        javascript_include_tag('mind-elixir.iife', plugin: 'redmine_redmind') +
        javascript_include_tag('redmine_redmind', plugin: 'redmine_redmind')
    rescue StandardError => e
      Rails.logger.error("[redmine_redmind] view_layouts_base_html_head failed: #{e.class}: #{e.message}")
      ''.html_safe
    end

    private

    def config_tag
      script = "window.RedmineRedmindConfig=#{mindmap_config.to_json};"
      %(<script type="text/javascript">#{script}</script>).html_safe
    end

    def mindmap_config
      {
        saveUrl: "#{Redmine::Utils.relative_url_root}/mindmaps/save",
        issueUrl: "#{Redmine::Utils.relative_url_root}/issues/",
        i18n: {
          edit: I18n.t(:button_edit, default: 'Edit'),
          save: I18n.t(:button_save, default: 'Save'),
          cancel: I18n.t(:button_cancel, default: 'Cancel'),
          editTitle: I18n.t(:label_mindmap_editor, default: 'Mindmap editor'),
          darkMode: I18n.t(:label_mindmap_dark_mode, default: 'Dark mode'),
          lightMode: I18n.t(:label_mindmap_light_mode, default: 'Light mode'),
          fullscreen: I18n.t(:label_mindmap_fullscreen, default: 'Fullscreen'),
          close: I18n.t(:label_mindmap_close, default: 'Close'),
          view: I18n.t(:label_mindmap_view, default: 'Mind Map'),
          saved: I18n.t(:notice_mindmap_saved, default: 'Mindmap saved'),
          conflict: I18n.t(:error_mindmap_conflict, default: 'This content changed. Please reload.'),
          failed: I18n.t(:error_mindmap_save_failed, default: 'Failed to save the mindmap.')
        }
      }
    end
  end
end
