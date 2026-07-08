require 'base64'

class MindmapsController < ApplicationController
  before_action :require_login, except: [:issues]

  # Resolve issue subjects for the "#1234" links rendered inside mindmap nodes,
  # so hovering a reference shows its title. Scoped through Issue.visible, so it
  # only ever returns what the current user (including anonymous on public
  # projects) may already see — no REST API toggle required.
  def issues
    ids = params[:ids].to_s.split(',').map(&:to_i).reject(&:zero?).uniq.first(200)
    subjects = {}
    if ids.any?
      Issue.visible.where(id: ids).pluck(:id, :subject).each do |id, subject|
        subjects[id.to_s] = subject
      end
    end
    render json: subjects
  end

  def update
    object = RedmineRedmind::Registry.load_object(params[:object_type], params[:object_id])
    return render_404 unless object
    return render_403 unless RedmineRedmind::Registry.editable?(object, User.current)

    field = RedmineRedmind::Registry.field_for(object)
    source = object.send(field).to_s

    begin
      patched, found = RedmineRedmind::TextPatcher.replace_block(
        source, decode_outline(params[:original]), params[:outline].to_s, params[:occurrence].to_i
      )
    rescue RedmineRedmind::TextPatcher::InvalidOutlineError
      return render_invalid
    end

    return render_conflict unless found

    if RedmineRedmind::Registry.persist(object, patched, User.current)
      render json: { status: 'ok', outline: params[:outline].to_s }
    else
      render_invalid(object.errors.full_messages.join(', ').presence)
    end
  rescue ActiveRecord::StaleObjectError
    render_conflict
  end

  private

  def decode_outline(value)
    Base64.decode64(value.to_s).force_encoding('UTF-8')
  end

  def render_conflict
    render json: { status: 'conflict', message: l(:error_mindmap_conflict) }, status: :conflict
  end

  def render_invalid(message = nil)
    render json: { status: 'error', message: message || l(:error_mindmap_invalid) },
           status: :unprocessable_entity
  end
end
