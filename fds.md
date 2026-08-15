console error. [audio-diagnostic] stop-error Error: Recording is empty or invalid. Source: 

  setAudioState('preview');
  } catch (e) {
    console.error('[audio-diagnostic] stop-error', e);
    handleAudioError(e, 'Unable to stop recording.'); 
  }

  };